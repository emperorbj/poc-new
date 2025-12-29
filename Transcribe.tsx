import { useEffect, useRef, useState } from "react";

type Utterance = {
  speaker: number; // 0, 1, etc from AssemblyAI
  text: string;
  start: number;
  end: number;
  confidence: number;
};

export default function MedicalTranscriber() {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState("Idle");
  const [isRecording, setIsRecording] = useState(false);

  // Streaming transcript (plain text, accumulated by BE)
  const [liveTranscript, setLiveTranscript] = useState("");

  // Final diarized transcript (structured)
  const [utterances, setUtterances] = useState<Utterance[]>([]);

  // Summary JSON
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    return () => stopRecording();
  }, []);

  async function startRecording() {
    setStatus("Initializing microphone...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    const ws = new WebSocket(
      "wss://meera-bot.onrender.com/api/v1/transcription/ws/transcribe"
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setIsRecording(true);
      setLiveTranscript("");
      setUtterances([]);
      setSummary(null);
      setStatus("Recording...");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "status") {
        setStatus(data.message);
        return;
      }

      /**
       * STREAMING
       * Backend sends the FULL transcript every time.
       * We render ONLY finalized content (no interim UI).
       */
      if (data.type === "interim" && data.is_final) {
        setLiveTranscript(data.transcript);
        return;
      }

      /**
       * FINAL DIARIZED TRANSCRIPT
       * This REPLACES streaming transcript entirely.
       */
      if (data.type === "diarized_transcript") {
        setUtterances(data.utterances);
        setLiveTranscript(""); // streaming phase ends here
        return;
      }

      /**
       * SUMMARY
       */
      if (data.type === "summary") {
        setSummary(
          typeof data.summary === "string"
            ? JSON.parse(data.summary)
            : data.summary
        );
        return;
      }

      if (data.type === "error") {
        setStatus("Error: " + data.message);
      }
    };

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        pcm[i] = Math.min(1, input[i]) * 0x7fff;
      }
      ws.send(pcm.buffer);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  }

  function stopRecording() {
    if (!isRecording) return;

    setStatus("Finalizing...");
    wsRef.current?.send(JSON.stringify({ type: "end_session" }));

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();

    setIsRecording(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Medical Transcription</h1>

      <div className="bg-white p-3 rounded shadow">
        <strong>Status:</strong> {status}
      </div>

      <div className="flex gap-3">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="flex-1 bg-teal-600 text-white py-2 rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="flex-1 bg-red-500 text-white py-2 rounded disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      {/* LIVE TRANSCRIPT (plain, no speakers) */}
      {liveTranscript && (
        <div className="bg-white p-4 rounded shadow whitespace-pre-wrap">
          {liveTranscript}
        </div>
      )}

      {/* FINAL DIARIZED TRANSCRIPT */}
      {utterances.length > 0 && (
        <div className="bg-white p-4 rounded shadow space-y-3">
          {utterances.map((u, i) => (
            <div key={i} className="border-l-4 pl-3 border-gray-400">
              <span className="text-xs font-bold">
                Speaker {u.speaker}
              </span>
              <p>{u.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* SUMMARY */}
      {summary && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-2">Summary</h2>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
