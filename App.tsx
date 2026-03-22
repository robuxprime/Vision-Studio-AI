/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  Download, 
  History, 
  Trash2, 
  Maximize2, 
  X,
  Layers,
  Type,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  hasReference: boolean;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vision_studio_history');
    if (saved) {
      try {
        setGeneratedImages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('vision_studio_history', JSON.stringify(generatedImages));
  }, [generatedImages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const model = "gemini-2.5-flash-image";
      
      let contents;
      if (referenceImage) {
        // Image-to-image or guided generation
        const base64Data = referenceImage.split(',')[1];
        const mimeType = referenceImage.split(';')[0].split(':')[1];
        
        contents = {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: `Use this image as a reference. ${prompt}`
            }
          ]
        };
      } else {
        // Text-to-image
        contents = {
          parts: [{ text: prompt }]
        };
      }

      const response = await genAI.models.generateContent({
        model: model,
        contents: contents,
        config: {
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          url: imageUrl,
          prompt: prompt,
          timestamp: Date.now(),
          hasReference: !!referenceImage
        };
        setGeneratedImages(prev => [newImage, ...prev]);
      }
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Erro ao gerar imagem. Verifique o console para mais detalhes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) setSelectedImage(null);
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Vision Studio AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setGeneratedImages([])}
              className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Histórico
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Prompt Criativo
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva a imagem que você deseja criar..."
                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Referência Visual (Opcional)
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-3 p-6
                  ${referenceImage ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-white/20 bg-black/20'}`}
              >
                {referenceImage ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setReferenceImage(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full hover:bg-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-white/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Clique para upload</p>
                      <p className="text-xs text-white/40 mt-1">PNG, JPG até 5MB</p>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Proporção
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 text-xs font-medium rounded-lg border transition-all
                      ${aspectRatio === ratio 
                        ? 'bg-emerald-500 border-emerald-500 text-black' 
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateImage}
              disabled={isGenerating || !prompt.trim()}
              className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                ${isGenerating || !prompt.trim()
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.98]'}`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Imagem
                </>
              )}
            </button>
          </section>
        </div>

        {/* Display Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Latest Generation or Empty State */}
          <section className="min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                Resultado
              </h2>
            </div>
            
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl overflow-hidden relative flex items-center justify-center group">
              {generatedImages.length > 0 ? (
                <div className="relative w-full h-full flex items-center justify-center p-8">
                  <motion.img
                    key={generatedImages[0].id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={generatedImages[0].url}
                    alt="Generated"
                    className="max-w-full max-h-[600px] object-contain rounded-xl shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedImage(generatedImages[0])}
                      className="p-3 bg-black/60 backdrop-blur-xl rounded-full hover:bg-emerald-500 hover:text-black transition-all"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => downloadImage(generatedImages[0].url, `vision-studio-${generatedImages[0].id}.png`)}
                      className="p-3 bg-black/60 backdrop-blur-xl rounded-full hover:bg-emerald-500 hover:text-black transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 p-12">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <ImageIcon className="w-10 h-10 text-white/20" />
                  </div>
                  <div>
                    <p className="text-white/60 font-medium">Nenhuma imagem gerada ainda</p>
                    <p className="text-white/30 text-sm mt-1">Use o painel lateral para começar sua criação</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* History */}
          {generatedImages.length > 1 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-500" />
                Histórico Recente
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {generatedImages.slice(1).map((img) => (
                    <motion.div
                      key={img.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square bg-white/5 border border-white/10 rounded-xl overflow-hidden group cursor-pointer"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img 
                        src={img.url} 
                        alt={img.prompt} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteImage(img.id);
                          }}
                          className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {img.hasReference && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 text-[10px] font-bold text-black rounded uppercase tracking-wider">
                          Ref
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Modal for Full View */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-6 h-6" />
            </button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lg:col-span-2 flex justify-center">
                <img 
                  src={selectedImage.url} 
                  alt="Full view" 
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest">Prompt</h3>
                  <p className="text-lg leading-relaxed">{selectedImage.prompt}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest">Detalhes</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs">
                      {new Date(selectedImage.timestamp).toLocaleString()}
                    </span>
                    {selectedImage.hasReference && (
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-xs">
                        Com Referência
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => downloadImage(selectedImage.url, `vision-studio-${selectedImage.id}.png`)}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Baixar Imagem
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/30 text-sm">
          <p>© 2026 Vision Studio AI. Powered by Google Gemini.</p>
        </div>
      </footer>
    </div>
  );
}
