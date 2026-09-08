import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, X, Check, FileSpreadsheet, ArrowRight, AlertCircle, Sparkles, Search, ChevronDown, Plus } from 'lucide-react';

function SearchableBoardClientSelect({ value, onChange, clients, boardName, onQuickCreateClient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Ordena os clientes de A a Z por ordem alfabética
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [clients]);

  // Filtra por termo de busca digitado pelo usuário
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return sortedClients;
    const term = searchTerm.toLowerCase().trim();
    return sortedClients.filter(c => 
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.cnpj && c.cnpj.includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  }, [sortedClients, searchTerm]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedClient = sortedClients.find(c => c.id === value);

  const handleCreate = async () => {
    const clientNameToCreate = (searchTerm || boardName || '').trim();
    if (!clientNameToCreate || !onQuickCreateClient) return;

    setIsCreating(true);
    try {
      const created = await onQuickCreateClient(clientNameToCreate);
      if (created && created.id) {
        onChange(created.id);
        setIsOpen(false);
      }
    } catch (err) {
      alert("Erro ao criar cliente: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-[240px] max-w-[340px] w-full">
      {/* Botão de Seleção */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg border text-left transition-all cursor-pointer ${
          value === 'ignore'
            ? 'bg-amber-50/80 border-amber-200 text-amber-900 font-medium'
            : 'bg-white border-gray-300 text-gray-900 font-bold hover:border-yellow-500 shadow-2xs'
        }`}
      >
        <span className="truncate flex items-center gap-1.5">
          {value === 'ignore' ? (
            <>
              <span className="text-amber-600 font-normal">⚠️</span>
              <span className="truncate">Ignorar lançamentos deste quadro</span>
            </>
          ) : selectedClient ? (
            <>
              <span className="text-yellow-600">💼</span>
              <span className="truncate">{selectedClient.name}</span>
            </>
          ) : (
            <span className="text-gray-400">Selecionar cliente...</span>
          )}
        </span>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover / Menu de Busca */}
      {isOpen && (
        <div className="absolute z-50 right-0 top-full mt-1 w-full min-w-[280px] bg-white border border-gray-200 rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 animate-in fade-in-0 zoom-in-95">
          {/* Input de Pesquisa Rápida */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Digite para pesquisar cliente (A-Z)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:bg-white text-gray-900 placeholder:text-gray-400 font-medium"
            />
          </div>

          {/* Lista de Opções Ordenadas */}
          <div className="max-h-[200px] overflow-y-auto flex flex-col gap-0.5 mt-1 divide-y divide-gray-50 scrollbar-thin">
            {/* Opção Ignorar */}
            <button
              type="button"
              onClick={() => {
                onChange('ignore');
                setIsOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                value === 'ignore' ? 'bg-amber-100 text-amber-950 font-bold' : 'hover:bg-amber-50 text-amber-800'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span>⚠️</span>
                <span className="truncate">Ignorar lançamentos deste quadro</span>
              </span>
              {value === 'ignore' && <Check size={13} className="text-amber-600 shrink-0" />}
            </button>

            {/* Clientes Filtrados A-Z */}
            {filteredClients.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">
                Nenhum cliente encontrado com "{searchTerm}".
              </div>
            ) : (
              filteredClients.map(c => {
                const isSelected = value === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-gray-100 text-gray-950 font-bold border border-gray-200' : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-gray-400">💼</span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    {isSelected && <Check size={13} className="text-gray-950 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Botão de Criação Rápida de Cliente em Tela */}
          {onQuickCreateClient && (
            <div className="pt-1.5 border-t border-gray-100 mt-1">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-950 font-bold border border-yellow-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
              >
                <Plus size={13} className="text-yellow-700 shrink-0" />
                <span className="truncate">
                  {isCreating ? 'Criando cliente...' : (
                    <>+ Criar cliente: "<strong>{searchTerm.trim() || boardName}</strong>"</>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportModal({ isOpen, onClose, clients, onImportComplete, onAddClient }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [uniqueBoards, setUniqueBoards] = useState([]);
  const [boardClientMap, setBoardClientMap] = useState({});
  const [step, setStep] = useState(1); // 1: Upload, 2: Board Mapping, 3: Preview & Confirm
  
  // Preview State
  const [previewEntries, setPreviewEntries] = useState([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState(new Set());

  const dialogRef = useRef(null);

  useEffect(() => {
    if (!dialogRef.current) return;
    if (isOpen) {
      dialogRef.current.showModal();
    } else {
      dialogRef.current.close();
    }
  }, [isOpen]);

  // Fallback close behavior when clicking backdrop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      if (e.target === dialog) {
        handleClose();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, []);

  const handleClose = () => {
    setFile(null);
    setCsvRows([]);
    setUniqueBoards([]);
    setBoardClientMap({});
    setStep(1);
    setPreviewEntries([]);
    setSelectedPreviewIds(new Set());
    onClose();
  };

  // Drag handlers
  const handleQuickCreateClient = async (name) => {
    const newClientData = {
      name: name.trim(),
      contractType: 'hybrid',
      fixedFee: 1000,
      hoursIncluded: 6.67,
      hourlyRate: 150,
      isActive: true
    };

    if (onAddClient) {
      const created = await onAddClient(newClientData);
      return created || { ...newClientData, id: `client-${Date.now()}` };
    }
    return { ...newClientData, id: `client-${Date.now()}` };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Parse CSV helper that supports quotes and comma/semicolon separators
  const splitCSVLine = (line, separator) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { parsedHeaders: [], rows: [] };
    
    // Detect separator (Brazilian CSV commonly uses semicolon ';', US uses comma ',')
    // We also check for tab '\t' just in case
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes(';')) separator = ';';
    else if (firstLine.includes('\t')) separator = '\t';
    
    const parsedHeaders = splitCSVLine(firstLine, separator).map(h => h.trim().replace(/^"|"$/g, ''));
    
    const rows = lines.slice(1).map(line => {
      const values = splitCSVLine(line, separator);
      const item = {};
      parsedHeaders.forEach((header, index) => {
        item[header] = (values[index] || '').trim().replace(/^"|"$/g, '');
      });
      return item;
    });
    
    return { parsedHeaders, rows };
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const { parsedHeaders, rows } = parseCSV(text);
      
      // Validate headers: must contain Board, Card, Note, TrackedTimeHours
      // (sometimes Planyway exports with slightly different casing, so we search flexibly)
      const hasBoard = parsedHeaders.some(h => h.toLowerCase() === 'board');
      const hasTrackedTime = parsedHeaders.some(h => h.toLowerCase().includes('trackedtime') || h.toLowerCase().includes('duration') || h.toLowerCase() === 'hours');
      
      if (!hasBoard || !hasTrackedTime) {
        alert("O arquivo CSV do Planyway deve conter pelo menos as colunas 'Board' e 'TrackedTimeHours' ou 'Duration'.");
        return;
      }

      // Store rows
      setFile(file);
      setCsvRows(rows);
      
      // Extract unique boards in the CSV
      const boards = new Set();
      rows.forEach(r => {
        // Find board key (case insensitive)
        const boardKey = Object.keys(r).find(k => k.toLowerCase() === 'board');
        if (boardKey && r[boardKey]) {
          boards.add(r[boardKey]);
        }
      });
      const uniqueBoardsList = Array.from(boards).sort();
      setUniqueBoards(uniqueBoardsList);

      // Pre-map boards to clients if there's a name match
      const initialMap = {};
      uniqueBoardsList.forEach(boardName => {
        let bestMatch = null;
        const bNameLower = boardName.toLowerCase();
        
        // Custom mapping: "2027 - CAMPANHA DE MATRÍCULAS CPR" maps to "Colégio Pedro & Rafael"
        if (bNameLower.includes('campanha de matrículas cpr') || bNameLower.includes('campanha de matriculas cpr')) {
          bestMatch = clients.find(c => c.name.toLowerCase().includes('pedro & rafael') || c.name.toLowerCase().includes('pedro e rafael'));
        }
        
        if (!bestMatch) {
          bestMatch = clients.find(c => {
            const cNameLower = c.name.toLowerCase();
            return cNameLower.includes(bNameLower) || bNameLower.includes(cNameLower);
          });
        }
        
        // Secondary fuzzy matching for CPR / Pedro / Rafael
        if (!bestMatch && (bNameLower.includes('cpr') || bNameLower.includes('pedro') || bNameLower.includes('rafael'))) {
          bestMatch = clients.find(c => c.name.toLowerCase().includes('pedro & rafael') || c.name.toLowerCase().includes('pedro e rafael'));
        }

        initialMap[boardName] = bestMatch ? bestMatch.id : 'ignore';
      });
      setBoardClientMap(initialMap);
      
      setStep(2);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleBoardMappingSubmit = () => {
    const normalizeKey = (key) => {
      if (!key) return '';
      return key.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    };

    // Consolidated preview map to combine duplicate task names for the same client and date
    const groupMap = new Map();
    
    csvRows.forEach((row, index) => {
      // Find columns keys flexibly
      const boardKey = Object.keys(row).find(k => normalizeKey(k) === 'board');
      const cardKey = Object.keys(row).find(k => normalizeKey(k) === 'card');
      const noteKey = Object.keys(row).find(k => normalizeKey(k) === 'note' || normalizeKey(k).includes('descri'));
      const startDateKey = Object.keys(row).find(k => normalizeKey(k).includes('startdate') || normalizeKey(k) === 'date' || normalizeKey(k) === 'data');
      const hoursKey = Object.keys(row).find(k => normalizeKey(k).includes('trackedtime') || normalizeKey(k).includes('duration') || normalizeKey(k) === 'hours' || normalizeKey(k).includes('consumo'));
      const billableKey = Object.keys(row).find(k => normalizeKey(k) === 'billable' || normalizeKey(k) === 'faturavel' || normalizeKey(k) === 'faturado' || normalizeKey(k) === 'cobravel');

      const boardVal = boardKey ? row[boardKey] : '';
      const targetClientId = boardClientMap[boardVal];

      // Skip if mapped to ignore
      if (!targetClientId || targetClientId === 'ignore') return;

      // 1. Process Date
      let rawDate = startDateKey ? row[startDateKey] : '';
      let formattedDate = '';
      if (rawDate) {
        // Strip time if exists: e.g. "2026-07-08 10:46" -> "2026-07-08"
        const datePart = rawDate.split(' ')[0];
        if (datePart.includes('/')) {
          const parts = datePart.split('/');
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts[0].length === 4) {
              formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }
        } else if (datePart.includes('-')) {
          const parts = datePart.split('-');
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
      }
      if (!formattedDate) {
        formattedDate = new Date().toISOString().split('T')[0];
      }

      // 2. Process Hours
      let rawHours = hoursKey ? row[hoursKey] : '0';
      rawHours = rawHours.replace(',', '.'); // Handle Brazilian decimals
      let hoursNum = parseFloat(rawHours) || 0;

      // 3. Process Description (Priority: Note > Card > Fallback)
      const noteVal = noteKey ? (row[noteKey] || '').trim() : '';
      const cardVal = cardKey ? (row[cardKey] || '').trim() : '';
      
      let finalDescription = '';
      if (noteVal && noteVal !== 'No note') {
        finalDescription = noteVal;
      } else if (cardVal && cardVal !== 'No card') {
        finalDescription = cardVal;
      } else {
        finalDescription = 'Atividade Planyway';
      }

      // 4. Process Billable flag strictly (Yes/Sim/True/1/S => true, otherwise false)
      const rawBillable = billableKey ? row[billableKey] : '';
      const rawBillableLower = rawBillable.toLowerCase().trim();
      const isBillable = rawBillableLower === 'yes' || 
                         rawBillableLower === 'true' || 
                         rawBillableLower === '1' || 
                         rawBillableLower === 'sim' ||
                         rawBillableLower === 's';

      // 5. Consolidation key: Client + Description + Billable status (regardless of date)
      const groupKey = `${targetClientId}___${finalDescription.toLowerCase().trim()}___${isBillable}`;
      
      if (groupMap.has(groupKey)) {
        const existing = groupMap.get(groupKey);
        existing.hours += hoursNum;
        // Keep the latest date for display
        if (new Date(formattedDate) > new Date(existing.requestDate)) {
          existing.requestDate = formattedDate;
          existing.deliveryDate = formattedDate;
        }
      } else {
        groupMap.set(groupKey, {
          id: `import-${index}-${Date.now()}`,
          clientId: targetClientId,
          requestDate: formattedDate,
          deliveryDate: formattedDate,
          description: finalDescription,
          type: 'Digital',
          requester: '',
          hours: hoursNum,
          jobLink: '',
          billable: isBillable,
          status: 'Finalizado'
        });
      }
    });

    const finalPreviewList = Array.from(groupMap.values());
    setPreviewEntries(finalPreviewList);
    setSelectedPreviewIds(new Set(finalPreviewList.map(e => e.id)));
    setStep(3);
  };

  const toggleSelectPreview = (id) => {
    const next = new Set(selectedPreviewIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPreviewIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedPreviewIds.size === previewEntries.length) {
      setSelectedPreviewIds(new Set());
    } else {
      setSelectedPreviewIds(new Set(previewEntries.map(e => e.id)));
    }
  };

  const handleImportComplete = () => {
    const finalEntries = previewEntries.filter(e => selectedPreviewIds.has(e.id));
    const sanitizedEntries = finalEntries.map(({ id, ...rest }) => rest);
    
    onImportComplete(sanitizedEntries);
    handleClose();
  };

  const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? client.name : 'Ignorado';
  };

  return (
    <dialog ref={dialogRef} onClose={handleClose} className="bg-white p-6 rounded-xl border border-gray-200" style={{ maxWidth: step === 3 ? '880px' : step === 2 ? '680px' : '550px', width: '90%' }}>
      <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
        <h3 className="font-title text-base font-bold text-gray-900">Importar CSV do Planyway</h3>
        <button className="text-gray-400 hover:text-gray-900 cursor-pointer" onClick={handleClose}>
          <X size={18} />
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="py-6 text-center flex flex-col items-center justify-center gap-3">
          <AlertCircle size={32} className="text-amber-500" />
          <p className="text-sm text-gray-500">Cadastre pelo menos um Cliente antes de importar lançamentos.</p>
          <button className="px-4 py-2 bg-yellow-400 text-gray-950 rounded-lg text-xs font-bold hover:bg-yellow-500 transition-colors" onClick={handleClose}>
            Entendido
          </button>
        </div>
      ) : (
        <>
          {/* Progress Indicators */}
          <div className="flex items-center gap-2 mb-6 text-[10px] font-bold uppercase tracking-wider text-gray-400 justify-center">
            <span className={step >= 1 ? 'text-yellow-600' : ''}>1. Upload</span>
            <ArrowRight size={10} className="text-gray-300" />
            <span className={step >= 2 ? 'text-yellow-600' : ''}>2. Associar Quadros</span>
            <ArrowRight size={10} className="text-gray-300" />
            <span className={step >= 3 ? 'text-yellow-600' : ''}>3. Confirmar</span>
          </div>

          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-yellow-400 bg-yellow-50/20' 
                    : 'border-gray-200 hover:border-yellow-400 bg-gray-50/20 hover:bg-yellow-50/10'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('planyway-file-input').click()}
              >
                <input 
                  id="planyway-file-input" 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <Upload size={36} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-800">Arraste o arquivo CSV do Planyway aqui</p>
                <span className="text-[10px] text-gray-400 font-medium">Ou clique para navegar nos seus arquivos</span>
              </div>

              <div className="bg-gray-50 border border-gray-150 rounded-lg p-4 text-xs text-gray-500 leading-relaxed">
                <h4 className="font-bold text-gray-700 mb-1">Dica de Exportação do Planyway:</h4>
                <p>Abra o relatório de tempo do Planyway, selecione o período do fechamento mensal, aplique os filtros necessários e baixe o arquivo no formato **CSV**.</p>
              </div>
            </div>
          )}

          {/* STEP 2: BOARD MAPPING */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex items-center gap-2 text-xs text-yellow-800">
                <FileSpreadsheet size={16} />
                <span>Arquivo carregado: <strong>{file?.name}</strong> com {csvRows.length} registros.</span>
              </div>

              <div>
                <h4 className="font-title text-sm font-bold text-gray-900 mb-1">Mapear Quadros para Clientes</h4>
                <p className="text-xs text-gray-400 mb-3">Encontramos os seguintes quadros (Boards) no arquivo. Associe cada um ao respectivo cliente no sistema.</p>
              </div>

              <div className="flex flex-col gap-3.5 max-h-[360px] overflow-y-auto border border-gray-150 rounded-xl p-3.5 bg-gray-50/30">
                {uniqueBoards.map(boardName => (
                  <div key={boardName} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-0.5 max-w-[240px]">
                      <span className="text-xs font-bold text-gray-900 break-words" title={boardName}>
                        {boardName}
                      </span>
                      <span className="text-[10px] text-gray-400">Quadro do Planyway</span>
                    </div>
                    
                    <SearchableBoardClientSelect
                      value={boardClientMap[boardName] || 'ignore'}
                      onChange={(val) => setBoardClientMap({...boardClientMap, [boardName]: val})}
                      clients={clients}
                      boardName={boardName}
                      onQuickCreateClient={handleQuickCreateClient}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
                <button 
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold cursor-pointer" 
                  onClick={() => setStep(1)}
                >
                  Voltar
                </button>
                <button 
                  className="px-4 py-2 bg-yellow-400 text-gray-950 hover:bg-yellow-500 rounded-lg text-xs font-bold cursor-pointer"
                  onClick={handleBoardMappingSubmit}
                >
                  Avançar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & CONFIRM */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">
                  Total consolidado para importação: <strong>{selectedPreviewIds.size}</strong> de {previewEntries.length} demandas.
                </span>
                <button 
                  className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 transition-colors"
                  onClick={toggleSelectAll}
                >
                  {selectedPreviewIds.size === previewEntries.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div className="overflow-x-auto w-full border border-gray-150 rounded-lg max-h-[300px]">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider font-title">
                      <th className="py-2.5 px-3 text-center" style={{ width: '40px' }}>Importar</th>
                      <th className="py-2.5 px-3">Cliente Destino</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Demanda</th>
                      <th className="py-2.5 px-3">Horas</th>
                      <th className="py-2.5 px-3">Faturável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {previewEntries.map(e => (
                      <tr 
                        key={e.id} 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedPreviewIds.has(e.id) ? '' : 'opacity-40'}`}
                        onClick={() => toggleSelectPreview(e.id)}
                      >
                        <td className="py-2 px-3 text-center" onClick={(evt) => evt.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500 cursor-pointer"
                            checked={selectedPreviewIds.has(e.id)} 
                            onChange={() => toggleSelectPreview(e.id)}
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-gray-700">{getClientName(e.clientId)}</td>
                        <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{e.requestDate.split('-').reverse().join('/')}</td>
                        <td className="py-2 px-3 max-w-[280px] text-gray-700 font-medium break-words leading-relaxed" title={e.description}>
                          {e.description}
                        </td>
                        <td className="py-2 px-3 font-bold text-gray-900">{e.hours.toFixed(2).replace('.', ',')}h</td>
                        <td className="py-2 px-3">
                          {e.billable ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full font-semibold">
                              <Sparkles size={8} /> Billable
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 bg-gray-50 text-gray-400 border border-gray-100 rounded-full font-semibold">
                              Interno
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
                <button 
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold cursor-pointer" 
                  onClick={() => setStep(2)}
                >
                  Voltar Mapeamento
                </button>
                <button 
                  className="px-4 py-2 bg-yellow-400 text-gray-950 hover:bg-yellow-500 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                  onClick={handleImportComplete}
                  disabled={selectedPreviewIds.size === 0}
                >
                  <Check size={14} /> Importar {selectedPreviewIds.size} Lançamentos
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
