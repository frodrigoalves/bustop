import { Camera } from "lucide-react";
import { useState, useRef } from "react";

interface PhotoGuideProps {
  type: "frontal" | "lateral" | "danos" | "contexto";
  onFileSelect: (file: File) => void;
  imagePreview?: string;
  onRemove?: () => void;
}

const guideInfo = {
  frontal: {
    title: "Frontal",
    description: "Frente do veículo",
    instruction: "Capture a frente mostrando placa e danos visíveis. Posicione-se a 3 metros de distância, centralize o veículo na foto."
  },
  lateral: {
    title: "Lateral",
    description: "Lado do veículo",
    instruction: "Fotografe o lado onde ocorreu o incidente. Inclua toda a extensão lateral do veículo, destacando marcas e amassados."
  },
  danos: {
    title: "Danos",
    description: "Detalhes da avaria",
    instruction: "Aproxime-se e capture os danos em detalhes. Tire fotos de cada avaria individualmente, mostrando profundidade e extensão."
  },
  contexto: {
    title: "Contexto",
    description: "Visão geral",
    instruction: "Capture o local com posicionamento dos veículos. Inclua sinalização, marcas no asfalto e referências do entorno."
  }
};

export const PhotoGuide = ({ type, onFileSelect, imagePreview, onRemove }: PhotoGuideProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const info = guideInfo[type];

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      inputRef.current?.click();
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = "";
    }
  };

  return (
    <div className="relative group">
      <input
        ref={inputRef}
        id={`photo-input-${type}`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {imagePreview ? (
        /* Preview Mode */
        <div className="flex flex-col gap-2">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-primary/50 animate-fade-in">
            <img 
              src={imagePreview} 
              alt={info.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            
            <div className="absolute top-2 left-2">
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-md text-xs font-medium">
                {info.title}
              </span>
            </div>
            
            <div className="absolute bottom-2 left-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex-1 bg-background/80 hover:bg-background text-foreground px-2 py-2 rounded-lg text-xs font-medium transition-all duration-300 backdrop-blur-sm active:scale-95"
              >
                Refazer
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="flex-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground px-2 py-2 rounded-lg text-xs font-medium transition-all duration-300 backdrop-blur-sm active:scale-95"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
          {/* Instruction text below photo */}
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight px-1 animate-fade-in">
            {info.instruction}
          </p>
        </div>
      ) : (
        /* Upload Mode */
        <button
          type="button"
          onClick={handleClick}
          className="relative w-full aspect-[4/3] rounded-xl border border-dashed transition-all duration-300 overflow-hidden border-border/50 hover:border-primary/50 bg-input/30 active:scale-[0.98]"
        >
          {/* Animation Container */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
            isAnimating ? "opacity-100" : "opacity-0"
          }`}>
            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
              {/* Camera Icon Animation */}
              <div className="absolute inset-0 animate-rotate-guide">
                <Camera className="w-full h-full text-primary/50" strokeWidth={1} />
              </div>
              {/* Pulse Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-soft" />
            </div>
          </div>

          {/* Static Content */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-3 transition-all duration-500 ${
            isAnimating ? "opacity-0" : "opacity-100"
          }`}>
            <Camera className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/60 mb-2 group-hover:text-primary/60 transition-colors duration-300" strokeWidth={1.5} />
            <h3 className="text-xs sm:text-sm font-medium text-foreground mb-0.5">{info.title}</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground/60 text-center leading-tight">{info.description}</p>
          </div>

          {/* Instruction Overlay */}
          {isAnimating && (
            <div className="absolute bottom-0 left-0 right-0 bg-primary/90 backdrop-blur-sm p-2 sm:p-3 animate-slide-in">
              <p className="text-[10px] sm:text-xs text-primary-foreground text-center font-medium leading-tight">
                {info.instruction}
              </p>
            </div>
          )}
        </button>
      )}
    </div>
  );
};