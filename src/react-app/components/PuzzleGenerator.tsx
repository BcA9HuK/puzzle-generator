import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, Settings, Shuffle } from 'lucide-react';

interface PuzzleSettings {
  columns: number;
  rows: number;
  missingPercentage: number;
}

export default function PuzzleGenerator() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<PuzzleSettings>({
    columns: 6,
    rows: 4,
    missingPercentage: 30
  });
  const [completeCanvas, setCompleteCanvas] = useState<HTMLCanvasElement | null>(null);
  const [missingCanvas, setMissingCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pieceStats, setPieceStats] = useState<{total: number, missing: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFont = useCallback(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    loadFont();
  }, [loadFont]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    processImageFile(file);
  }, []);

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImage(img);
      generatePuzzles(img, settings);
    };
    img.src = URL.createObjectURL(file);
  }, [settings]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      processImageFile(imageFile);
    } else {
      alert('Пожалуйста, перетащите файл изображения');
    }
  }, [processImageFile]);

  const generatePuzzles = useCallback((img: HTMLImageElement, settings: PuzzleSettings) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      // Create canvases
      const completeCanvas = document.createElement('canvas');
      const missingCanvas = document.createElement('canvas');
      
      const maxWidth = 800;
      const maxHeight = 600;
      
      let { width, height } = img;
      
      // Scale image to fit within max dimensions
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width *= scale;
        height *= scale;
      }
      
      completeCanvas.width = width;
      completeCanvas.height = height;
      missingCanvas.width = width;
      missingCanvas.height = height;
      
      const completeCtx = completeCanvas.getContext('2d')!;
      const missingCtx = missingCanvas.getContext('2d')!;
      
      // Draw original image on both canvases
      completeCtx.drawImage(img, 0, 0, width, height);
      missingCtx.drawImage(img, 0, 0, width, height);
      
      // Calculate piece dimensions
      const pieceWidth = width / settings.columns;
      const pieceHeight = height / settings.rows;
      
      // Create puzzle piece pattern with interlocking tabs and blanks
      const piecePattern: Array<Array<{top: boolean, right: boolean, bottom: boolean, left: boolean}>> = [];
      
      // Initialize pattern grid
      for (let row = 0; row < settings.rows; row++) {
        piecePattern[row] = [];
        for (let col = 0; col < settings.columns; col++) {
          piecePattern[row][col] = {
            top: row === 0 ? false : Math.random() > 0.5,
            right: col === settings.columns - 1 ? false : Math.random() > 0.5,
            bottom: row === settings.rows - 1 ? false : Math.random() > 0.5,
            left: col === 0 ? false : Math.random() > 0.5
          };
        }
      }
      
      // Ensure interlocking consistency
      for (let row = 0; row < settings.rows; row++) {
        for (let col = 0; col < settings.columns; col++) {
          const piece = piecePattern[row][col];
          
          // Right neighbor
          if (col < settings.columns - 1) {
            piecePattern[row][col + 1].left = !piece.right;
          }
          
          // Bottom neighbor
          if (row < settings.rows - 1) {
            piecePattern[row + 1][col].top = !piece.bottom;
          }
        }
      }
      
      const drawRealisticPuzzlePiece = (
        ctx: CanvasRenderingContext2D, 
        x: number, 
        y: number, 
        w: number, 
        h: number, 
        tabs: {top: boolean, right: boolean, bottom: boolean, left: boolean}
      ) => {
        const tabSize = Math.min(w, h) * 0.2;
        const tabRadius = tabSize * 0.8;
        
        ctx.beginPath();
        
        // Start from top-left corner
        ctx.moveTo(x, y);
        
        // Top edge
        if (tabs.top && y > 0) {
          const midX = x + w / 2;
          ctx.lineTo(midX - tabSize * 0.6, y);
          ctx.quadraticCurveTo(midX - tabSize * 0.4, y - tabRadius * 0.3, midX - tabSize * 0.3, y - tabRadius);
          ctx.quadraticCurveTo(midX, y - tabRadius * 1.2, midX + tabSize * 0.3, y - tabRadius);
          ctx.quadraticCurveTo(midX + tabSize * 0.4, y - tabRadius * 0.3, midX + tabSize * 0.6, y);
          ctx.lineTo(x + w, y);
        } else if (!tabs.top && y > 0) {
          const midX = x + w / 2;
          ctx.lineTo(midX - tabSize * 0.6, y);
          ctx.quadraticCurveTo(midX - tabSize * 0.4, y + tabRadius * 0.3, midX - tabSize * 0.3, y + tabRadius);
          ctx.quadraticCurveTo(midX, y + tabRadius * 1.2, midX + tabSize * 0.3, y + tabRadius);
          ctx.quadraticCurveTo(midX + tabSize * 0.4, y + tabRadius * 0.3, midX + tabSize * 0.6, y);
          ctx.lineTo(x + w, y);
        } else {
          ctx.lineTo(x + w, y);
        }
        
        // Right edge
        if (tabs.right && x + w < width) {
          const midY = y + h / 2;
          ctx.lineTo(x + w, midY - tabSize * 0.6);
          ctx.quadraticCurveTo(x + w + tabRadius * 0.3, midY - tabSize * 0.4, x + w + tabRadius, midY - tabSize * 0.3);
          ctx.quadraticCurveTo(x + w + tabRadius * 1.2, midY, x + w + tabRadius, midY + tabSize * 0.3);
          ctx.quadraticCurveTo(x + w + tabRadius * 0.3, midY + tabSize * 0.4, x + w, midY + tabSize * 0.6);
          ctx.lineTo(x + w, y + h);
        } else if (!tabs.right && x + w < width) {
          const midY = y + h / 2;
          ctx.lineTo(x + w, midY - tabSize * 0.6);
          ctx.quadraticCurveTo(x + w - tabRadius * 0.3, midY - tabSize * 0.4, x + w - tabRadius, midY - tabSize * 0.3);
          ctx.quadraticCurveTo(x + w - tabRadius * 1.2, midY, x + w - tabRadius, midY + tabSize * 0.3);
          ctx.quadraticCurveTo(x + w - tabRadius * 0.3, midY + tabSize * 0.4, x + w, midY + tabSize * 0.6);
          ctx.lineTo(x + w, y + h);
        } else {
          ctx.lineTo(x + w, y + h);
        }
        
        // Bottom edge
        if (tabs.bottom && y + h < height) {
          const midX = x + w / 2;
          ctx.lineTo(midX + tabSize * 0.6, y + h);
          ctx.quadraticCurveTo(midX + tabSize * 0.4, y + h + tabRadius * 0.3, midX + tabSize * 0.3, y + h + tabRadius);
          ctx.quadraticCurveTo(midX, y + h + tabRadius * 1.2, midX - tabSize * 0.3, y + h + tabRadius);
          ctx.quadraticCurveTo(midX - tabSize * 0.4, y + h + tabRadius * 0.3, midX - tabSize * 0.6, y + h);
          ctx.lineTo(x, y + h);
        } else if (!tabs.bottom && y + h < height) {
          const midX = x + w / 2;
          ctx.lineTo(midX + tabSize * 0.6, y + h);
          ctx.quadraticCurveTo(midX + tabSize * 0.4, y + h - tabRadius * 0.3, midX + tabSize * 0.3, y + h - tabRadius);
          ctx.quadraticCurveTo(midX, y + h - tabRadius * 1.2, midX - tabSize * 0.3, y + h - tabRadius);
          ctx.quadraticCurveTo(midX - tabSize * 0.4, y + h - tabRadius * 0.3, midX - tabSize * 0.6, y + h);
          ctx.lineTo(x, y + h);
        } else {
          ctx.lineTo(x, y + h);
        }
        
        // Left edge
        if (tabs.left && x > 0) {
          const midY = y + h / 2;
          ctx.lineTo(x, midY + tabSize * 0.6);
          ctx.quadraticCurveTo(x - tabRadius * 0.3, midY + tabSize * 0.4, x - tabRadius, midY + tabSize * 0.3);
          ctx.quadraticCurveTo(x - tabRadius * 1.2, midY, x - tabRadius, midY - tabSize * 0.3);
          ctx.quadraticCurveTo(x - tabRadius * 0.3, midY - tabSize * 0.4, x, midY - tabSize * 0.6);
          ctx.lineTo(x, y);
        } else if (!tabs.left && x > 0) {
          const midY = y + h / 2;
          ctx.lineTo(x, midY + tabSize * 0.6);
          ctx.quadraticCurveTo(x + tabRadius * 0.3, midY + tabSize * 0.4, x + tabRadius, midY + tabSize * 0.3);
          ctx.quadraticCurveTo(x + tabRadius * 1.2, midY, x + tabRadius, midY - tabSize * 0.3);
          ctx.quadraticCurveTo(x + tabRadius * 0.3, midY - tabSize * 0.4, x, midY - tabSize * 0.6);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        ctx.closePath();
      };
      
      // Draw realistic puzzle pieces on complete canvas
      completeCtx.strokeStyle = '#000000';
      completeCtx.lineWidth = 2;
      completeCtx.lineCap = 'round';
      completeCtx.lineJoin = 'round';
      
      for (let row = 0; row < settings.rows; row++) {
        for (let col = 0; col < settings.columns; col++) {
          const x = col * pieceWidth;
          const y = row * pieceHeight;
          const tabs = piecePattern[row][col];
          
          drawRealisticPuzzlePiece(completeCtx, x, y, pieceWidth, pieceHeight, tabs);
          completeCtx.stroke();
        }
      }
      
      // Create missing pieces on missing canvas
      const totalPieces = settings.rows * settings.columns;
      const missingCount = Math.floor(totalPieces * settings.missingPercentage / 100);
      const missingIndices = new Set<number>();
      
      while (missingIndices.size < missingCount) {
        missingIndices.add(Math.floor(Math.random() * totalPieces));
      }

      // Update piece statistics
      setPieceStats({ total: totalPieces, missing: missingCount });
      
      // Clear missing pieces with realistic puzzle piece shapes
      missingIndices.forEach(index => {
        const row = Math.floor(index / settings.columns);
        const col = index % settings.columns;
        const x = col * pieceWidth;
        const y = row * pieceHeight;
        const tabs = piecePattern[row][col];
        
        missingCtx.save();
        missingCtx.globalCompositeOperation = 'destination-out';
        
        // Create realistic puzzle piece path for cutting
        drawRealisticPuzzlePiece(missingCtx, x, y, pieceWidth, pieceHeight, tabs);
        missingCtx.fill();
        
        missingCtx.restore();
      });
      
      // Draw puzzle piece borders on missing canvas as well
      missingCtx.strokeStyle = '#000000';
      missingCtx.lineWidth = 2;
      missingCtx.lineCap = 'round';
      missingCtx.lineJoin = 'round';
      
      for (let row = 0; row < settings.rows; row++) {
        for (let col = 0; col < settings.columns; col++) {
          const x = col * pieceWidth;
          const y = row * pieceHeight;
          const tabs = piecePattern[row][col];
          
          drawRealisticPuzzlePiece(missingCtx, x, y, pieceWidth, pieceHeight, tabs);
          missingCtx.stroke();
        }
      }
      
      setCompleteCanvas(completeCanvas);
      setMissingCanvas(missingCanvas);
      setIsProcessing(false);
    }, 100);
  }, []);

  const downloadImage = useCallback((canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const generateNew = useCallback(() => {
    if (image) {
      generatePuzzles(image, settings);
    }
  }, [image, settings, generatePuzzles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Генератор Пазлов
          </h1>
          <p className="text-gray-600 text-lg">
            Загрузите изображение и создайте пазл с настраиваемыми параметрами
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Настройки</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Загрузить изображение
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-100 scale-105' 
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
                      {isDragOver ? 'Отпустите файл здесь' : 'Перетащите изображение или нажмите для выбора'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF до 10MB</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Столбцы: {settings.columns}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={settings.columns}
                    onChange={(e) => setSettings(prev => ({ ...prev, columns: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none slider"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Строки: {settings.rows}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={settings.rows}
                    onChange={(e) => setSettings(prev => ({ ...prev, rows: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none slider"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Отсутствующие кусочки: {settings.missingPercentage}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={settings.missingPercentage}
                    onChange={(e) => setSettings(prev => ({ ...prev, missingPercentage: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none slider"
                  />
                </div>

                <button
                  onClick={generateNew}
                  disabled={!image || isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  {isProcessing ? 'Создаю пазл...' : 'Создать пазл'}
                </button>

                <button
                  onClick={generateNew}
                  disabled={!image}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                >
                  Новая схема кусочков
                </button>

                {pieceStats && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-2">Статистика пазла</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Всего фрагментов:</span>
                        <span className="font-medium">{pieceStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Отсутствует:</span>
                        <span className="font-medium text-red-600">{pieceStats.missing}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Остается:</span>
                        <span className="font-medium text-green-600">{pieceStats.total - pieceStats.missing}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {completeCanvas && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Пазл с границами</h3>
                    <button
                      onClick={() => downloadImage(completeCanvas, 'puzzle-complete.png')}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Скачать
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <canvas
                      ref={(el) => {
                        if (el && completeCanvas) {
                          el.width = completeCanvas.width;
                          el.height = completeCanvas.height;
                          const ctx = el.getContext('2d')!;
                          ctx.drawImage(completeCanvas, 0, 0);
                        }
                      }}
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {missingCanvas && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Пазл с отсутствующими кусочками</h3>
                    <button
                      onClick={() => downloadImage(missingCanvas, 'puzzle-missing.png')}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Скачать
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100">
                    <canvas
                      ref={(el) => {
                        if (el && missingCanvas) {
                          el.width = missingCanvas.width;
                          el.height = missingCanvas.height;
                          const ctx = el.getContext('2d')!;
                          ctx.drawImage(missingCanvas, 0, 0);
                        }
                      }}
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
              )}

              {!image && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Upload className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Загрузите изображение для начала
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Перетащите файл сюда или выберите картинку в панели настроек
                  </p>
                  <div className="text-xs text-gray-400">
                    Поддерживаются форматы: PNG, JPG, GIF
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
