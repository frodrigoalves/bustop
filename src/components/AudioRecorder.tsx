import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  currentText: string;
}

export const AudioRecorder = ({ onTranscription, currentText }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const MAX_DURATION = 120; // 2 minutes max

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "pt-BR";
      
      recognitionRef.current.onresult = (event) => {
        let interim = "";
        let final = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        
        if (final) {
          setTranscription(prev => (prev + final).trim());
        }
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setError("Permissão de microfone negada.");
        }
      };
    }

    return () => {
      stopRecording();
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, []);

  // Update parent when transcription changes
  useEffect(() => {
    if (transcription) {
      onTranscription(currentText ? `${currentText} ${transcription}` : transcription);
    }
  }, [transcription]);

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Recognition already started");
        }
      }
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Erro ao acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log("Recognition already stopped");
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    setInterimTranscript("");
  };

  const removeAudio = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setAudioBlob(null);
    setTranscription("");
    setDuration(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Check if Speech Recognition is supported
  const isSpeechRecognitionSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {!audioURL ? (
          <>
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              className={`gap-2 ${isRecording ? "animate-pulse" : ""}`}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4" />
                  <span>Parar</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span>Gravar Áudio</span>
                </>
              )}
            </Button>
            
            {isRecording && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="font-mono font-medium text-foreground">
                  {formatTime(duration)} / {formatTime(MAX_DURATION)}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <audio
              ref={audioRef}
              src={audioURL}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            <Button
              type="button"
              onClick={togglePlayback}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Ouvir</span>
                </>
              )}
            </Button>
            
            <Button
              type="button"
              onClick={removeAudio}
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remover</span>
            </Button>
            
            <div className="flex items-center gap-1 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">{formatTime(duration)}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Real-time transcription display */}
      {(isRecording || transcription) && (
        <div className="p-3 bg-muted/50 border border-border/50 rounded-xl">
          <span className="text-xs font-medium text-muted-foreground uppercase mb-2 block">
            Transcrição {isRecording && "(tempo real)"}
          </span>
          <p className="text-sm text-foreground">
            {transcription}
            {interimTranscript && (
              <span className="text-muted-foreground italic"> {interimTranscript}</span>
            )}
            {!transcription && !interimTranscript && isRecording && (
              <span className="text-muted-foreground italic">Aguardando fala...</span>
            )}
          </p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Helper text */}
      {!isRecording && !audioURL && !error && (
        <p className="text-xs text-muted-foreground">
          {isSpeechRecognitionSupported 
            ? "Grave um áudio descrevendo a ocorrência. A transcrição será adicionada automaticamente."
            : "Grave um áudio descrevendo a ocorrência. (Transcrição não disponível neste navegador)"}
        </p>
      )}
    </div>
  );
};

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
