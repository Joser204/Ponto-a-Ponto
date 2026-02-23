import { useState, useRef, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle,
  FileText,
  Printer,
  PlusCircle,
  LayoutGrid,
  Settings,
  ShieldCheck,
  History
} from 'lucide-react';
import jsPDFCore from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { cn } from './utils/cn';

// Types
type ComplianceStatus = 'ATENDE' | 'NÃO ATENDE' | 'INCERTO' | 'DEPENDE';

interface Requirement {
  id: string;
  name: string;
  tenderSpec: string;
  productSpec: string;
  status: ComplianceStatus;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

interface Category {
  id: string;
  name: string;
  requirements: Requirement[];
}

interface ComparisonData {
  title: string;
  equipmentName: string;
  tenderName: string;
  organization: string;
  tenderNumber: string;
  itemType: string;
  responsible: string;
  date: string;
  categories: Category[];
  finalNotes: string;
  finalStatus: 'APROVADO' | 'APROVADO COM RESSALVAS' | 'REPROVADO';
}

const DEFAULT_DATA: ComparisonData = {
  title: "Análise Comparativa Técnica",
  equipmentName: "Workstation Dell Precision 3000",
  tenderName: "Pregão Eletrônico SRP 05/2024",
  organization: "Ministério da Tecnologia",
  tenderNumber: "05/2024",
  itemType: "Computador de Alto Desempenho",
  responsible: "Arq. Software Senior",
  date: format(new Date(), 'yyyy-MM-dd'),
  finalNotes: "",
  finalStatus: 'APROVADO',
  categories: [
    {
      id: '1',
      name: 'PROCESSADOR',
      requirements: [
        {
          id: '1-1',
          name: 'Arquitetura',
          tenderSpec: 'Mínimo 8 núcleos físicos, 16 threads',
          productSpec: 'Intel Core i7-13700, 16 núcleos, 24 threads',
          status: 'ATENDE',
          notes: 'Superior ao solicitado no edital.',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin'
        }
      ]
    },
    {
      id: '2',
      name: 'MEMÓRIA RAM',
      requirements: [
        {
          id: '2-1',
          name: 'Capacidade',
          tenderSpec: 'Mínimo 32GB DDR5 4800MHz',
          productSpec: '32GB DDR5 5200MHz',
          status: 'ATENDE',
          notes: 'Atende integralmente.',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin'
        }
      ]
    }
  ]
};

const STATUS_CONFIG = {
  'ATENDE': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  'NÃO ATENDE': { color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  'INCERTO': { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle },
  'DEPENDE': { color: 'bg-sky-50 text-sky-700 border-sky-200', icon: HelpCircle },
};

export function App() {
  const [data, setData] = useState<ComparisonData>(DEFAULT_DATA);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Auto-calculation for Executive Summary
  const executiveSummary = useMemo(() => {
    const allRequirements = data.categories.flatMap(c => c.requirements);
    const positives = allRequirements.filter(r => r.status === 'ATENDE');
    const negatives = allRequirements.filter(r => r.status === 'NÃO ATENDE');
    const total = allRequirements.length;
    
    return {
      positives,
      negatives,
      total,
      conformityRate: total > 0 ? (positives.length / total) * 100 : 0
    };
  }, [data]);

  const updateHeader = (field: keyof ComparisonData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const addCategory = () => {
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'NOVA CATEGORIA',
      requirements: []
    };
    setData(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
  };

  const addRequirement = (categoryId: string) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            requirements: [
              ...cat.requirements,
              {
                id: Math.random().toString(36).substr(2, 9),
                name: '',
                tenderSpec: '',
                productSpec: '',
                status: 'ATENDE',
                notes: '',
                updatedAt: new Date().toISOString(),
                updatedBy: 'Usuário'
              }
            ]
          };
        }
        return cat;
      })
    }));
  };

  const updateRequirement = (catId: string, reqId: string, updates: Partial<Requirement>) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id === catId) {
          return {
            ...cat,
            requirements: cat.requirements.map(req => 
              req.id === reqId ? { ...req, ...updates, updatedAt: new Date().toISOString() } : req
            )
          };
        }
        return cat;
      })
    }));
  };

  const exportPDF = async () => {
    if (isExporting) return;

    try {
      // Garante que o layout de preview esteja ativo antes de capturar
      if (activeTab !== 'preview') {
        setActiveTab('preview');
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const element = printRef.current;
      if (!element) {
        alert('Área de relatório não encontrada para geração do PDF.');
        return;
      }

      setIsExporting(true);

      const canvas = await html2canvas(element, {
        scale: window.devicePixelRatio > 1 ? 2 : 1.5,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new (jsPDFCore as any)('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Usa as dimensões originais do canvas para calcular a proporção da imagem
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `Relatorio_Tecnico_${data.tenderNumber || 'pregao'}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao gerar PDF', error);
      alert('Não foi possível gerar o PDF. Verifique se há conteúdo na visualização e tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#000080] p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#000080] leading-none uppercase tracking-tight">RL Informática</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Tecnologia é nosso mundo</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('editor')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'editor' ? "bg-white shadow-sm text-[#000080]" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Editor Técnico
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === 'preview' ? "bg-white shadow-sm text-[#000080]" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Visualização PDF
            </button>
          </div>
          <button 
            onClick={exportPDF}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-900/10",
              isExporting
                ? "bg-slate-400 cursor-wait text-white"
                : "bg-[#000080] hover:bg-[#0000a0] text-white"
            )}
          >
            <Printer className="w-4 h-4" />
            {isExporting ? 'Gerando PDF...' : 'Gerar Laudo PDF'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {activeTab === 'editor' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Configuration */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <Settings className="w-5 h-5 text-[#000080]" />
                <input 
                  value={data.title === "Análise Comparativa Técnica" ? "Pregão Eletrônico" : data.title} 
                  onChange={e => updateHeader('title', e.target.value)}
                  className="text-lg font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField label="Órgão Licitante" value={data.organization} onChange={v => updateHeader('organization', v)} />
                <InputField label="Número do Pregão" value={data.tenderNumber} onChange={v => updateHeader('tenderNumber', v)} />
                <InputField label="Tipo de Item" value={data.itemType} onChange={v => updateHeader('itemType', v)} />
                <InputField label="Equipamento Ofertado" value={data.equipmentName} onChange={v => updateHeader('equipmentName', v)} />
                <InputField label="Responsável Técnico" value={data.responsible} onChange={v => updateHeader('responsible', v)} />
                <InputField label="Data da Análise" type="date" value={data.date} onChange={v => updateHeader('date', v)} />
              </div>
            </section>

            {/* Analysis Table Editor */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-[#000080]" />
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">Especificação Técnica Item</h2>
                    <input 
                      value={data.tenderNumber.split('/').pop() || '1'} 
                      onChange={e => updateHeader('tenderNumber', e.target.value)}
                      className="w-12 text-xl font-bold text-slate-800 bg-slate-100 rounded text-center"
                    />
                  </div>
                </div>
                <button 
                  onClick={addCategory}
                  className="flex items-center gap-2 text-[#000080] hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold border border-blue-100 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Nova Categoria
                </button>
              </div>

              {data.categories.map((cat) => (
                <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                    <input 
                      value={cat.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setData(prev => ({
                          ...prev,
                          categories: prev.categories.map(c => c.id === cat.id ? { ...c, name: newName } : c)
                        }));
                      }}
                      className="bg-transparent font-bold text-[#000080] uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-blue-200 rounded px-2"
                    />
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => addRequirement(cat.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        title="Adicionar Requisito"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setData(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== cat.id) }));
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                          <th className="px-4 py-2 w-1/4">Requisito Técnico</th>
                          <th className="px-4 py-2 w-1/4">Edital</th>
                          <th className="px-4 py-2 w-1/4">Ofertado</th>
                          <th className="px-4 py-2 w-40 text-center">Status</th>
                          <th className="px-4 py-2">Observações</th>
                          <th className="px-2 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cat.requirements.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-3 align-top">
                              <textarea 
                                value={req.name}
                                onChange={(e) => updateRequirement(cat.id, req.id, { name: e.target.value })}
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-100 rounded text-sm resize-none"
                                placeholder="Nome do requisito..."
                                rows={2}
                              />
                            </td>
                            <td className="px-4 py-3 align-top">
                              <textarea 
                                value={req.tenderSpec}
                                onChange={(e) => updateRequirement(cat.id, req.id, { tenderSpec: e.target.value })}
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-100 rounded text-sm text-slate-600 italic resize-none"
                                placeholder="Especificação do edital..."
                                rows={2}
                              />
                            </td>
                            <td className="px-4 py-3 align-top">
                              <textarea 
                                value={req.productSpec}
                                onChange={(e) => updateRequirement(cat.id, req.id, { productSpec: e.target.value })}
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-100 rounded text-sm font-medium resize-none"
                                placeholder="Especificação técnica do produto..."
                                rows={2}
                              />
                            </td>
                            <td className="px-4 py-3 align-top">
                              <select 
                                value={req.status}
                                onChange={(e) => updateRequirement(cat.id, req.id, { status: e.target.value as ComplianceStatus })}
                                className={cn(
                                  "w-full text-[10px] font-bold py-1 px-2 rounded-full border text-center appearance-none cursor-pointer",
                                  STATUS_CONFIG[req.status].color
                                )}
                              >
                                <option value="ATENDE">ATENDE</option>
                                <option value="NÃO ATENDE">NÃO ATENDE</option>
                                <option value="INCERTO">INCERTO</option>
                                <option value="DEPENDE">DEPENDE</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <textarea 
                                value={req.notes}
                                onChange={(e) => updateRequirement(cat.id, req.id, { notes: e.target.value })}
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-100 rounded text-sm text-slate-500 resize-none"
                                placeholder="Justificativa técnica..."
                                rows={2}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => {
                                  setData(prev => ({
                                    ...prev,
                                    categories: prev.categories.map(c => 
                                      c.id === cat.id ? { ...c, requirements: c.requirements.filter(r => r.id !== req.id) } : c
                                    )
                                  }));
                                }}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>

            {/* Modular Outcome Section */}
            <section className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                <FileText className="w-6 h-6 text-[#000080]" />
                <h2 className="text-xl font-bold uppercase tracking-wider text-slate-800">Resultado da Análise</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status Final</label>
                    <select 
                      value={data.finalStatus}
                      onChange={(e) => setData(prev => ({ ...prev, finalStatus: e.target.value as any }))}
                      className={cn(
                        "w-full p-4 rounded-lg font-black text-center text-lg transition-all border-2 appearance-none",
                        data.finalStatus === 'APROVADO' && "bg-emerald-50 border-emerald-500 text-emerald-700",
                        data.finalStatus === 'REPROVADO' && "bg-red-50 border-red-500 text-red-700",
                        data.finalStatus === 'APROVADO COM RESSALVAS' && "bg-amber-50 border-amber-500 text-amber-700"
                      )}
                    >
                      <option value="APROVADO">APROVADO</option>
                      <option value="APROVADO COM RESSALVAS">APROVADO COM RESSALVAS</option>
                      <option value="REPROVADO">REPROVADO</option>
                    </select>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="flex flex-col gap-2 h-full">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações Finais / Parecer Técnico</label>
                    <textarea 
                      value={data.finalNotes}
                      onChange={(e) => updateHeader('finalNotes', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 flex-grow min-h-[120px] text-sm leading-relaxed"
                      placeholder="Insira as observações finais, ressalvas ou justificativas da conclusão técnica..."
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* PDF Preview Mode */
          <div className="flex justify-center p-6 bg-slate-200 rounded-xl overflow-auto">
            <div 
              ref={printRef}
              className="bg-white w-[210mm] min-h-[297mm] p-10 shadow-xl origin-top"
              id="report-pdf"
            >
              {/* PDF Header */}
              <div className="flex justify-between items-start border-b-4 border-[#000080] pb-8 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[#000080] p-2 rounded">
                      <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-[#000080] tracking-tight">RELATÓRIO TÉCNICO</h1>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Organização Licitante</p>
                    <p className="text-lg font-bold text-slate-800">{data.organization}</p>
                  </div>
                </div>
                <div className="text-right space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Documento Gerado em</p>
                    <p className="font-mono font-bold">{format(new Date(data.date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
              </div>

              {/* Project Info Grid */}
              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="space-y-4">
                  <PdfInfoItem label="Objeto" value={data.itemType} />
                  <PdfInfoItem label="Número do Pregão" value={data.tenderNumber} />
                </div>
                <div className="space-y-4">
                  <PdfInfoItem label="Equipamento Ofertado" value={data.equipmentName} />
                  <PdfInfoItem label="Responsável" value={data.responsible} />
                </div>
              </div>

              {/* Table of Categories */}
              <div className="space-y-8">
                {data.categories.map((cat) => (
                  <div key={cat.id}>
                    <h3 className="bg-slate-100 text-[#000080] px-4 py-2 font-black text-sm uppercase tracking-widest mb-2 border-l-4 border-[#000080]">
                      {cat.name}
                    </h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-slate-500">
                          <th className="text-left py-2 w-1/4">Requisito</th>
                          <th className="text-left py-2 w-1/4 px-2 border-x border-slate-100">Exigência Edital</th>
                          <th className="text-left py-2 w-1/4 px-2 border-r border-slate-100">Proposta Técnica</th>
                          <th className="text-center py-2 w-24">Parecer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cat.requirements.map(req => (
                          <tr key={req.id}>
                            <td className="py-3 font-bold pr-2">{req.name}</td>
                            <td className="py-3 px-2 border-x border-slate-50 text-slate-600 italic leading-relaxed">{req.tenderSpec}</td>
                            <td className="py-3 px-2 border-r border-slate-50 font-medium leading-relaxed">{req.productSpec}</td>
                            <td className="py-3 text-center">
                              <span className={cn(
                                "px-2 py-1 rounded text-[9px] font-bold",
                                req.status === 'ATENDE' ? "bg-emerald-100 text-emerald-800" :
                                req.status === 'NÃO ATENDE' ? "bg-red-100 text-red-800" :
                                "bg-slate-100 text-slate-800"
                              )}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* Final Conclusion Summary */}
              <div className="mt-16 border-t-2 border-slate-200 pt-12">
                <h2 className="text-xl font-black text-[#000080] mb-8 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6" />
                  CONCLUSÃO E PARECER TÉCNICO
                </h2>

                <div className="grid grid-cols-3 gap-8 mb-12">
                  <div className="col-span-1 bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Conformidade Técnica</p>
                    <p className="text-4xl font-black text-[#000080]">{Math.round(executiveSummary.conformityRate)}%</p>
                    <p className="text-[10px] text-slate-500 mt-1">{executiveSummary.positives.length} de {executiveSummary.total} requisitos</p>
                  </div>
                  
                  <div className={cn(
                    "col-span-2 p-6 rounded-xl border-2 flex flex-col justify-center items-center",
                    data.finalStatus === 'APROVADO' ? "bg-emerald-50 border-emerald-500 text-emerald-800" :
                    data.finalStatus === 'REPROVADO' ? "bg-red-50 border-red-500 text-red-800" :
                    "bg-amber-50 border-amber-500 text-amber-800"
                  )}>
                    <p className="text-[10px] font-bold uppercase mb-2">Resultado Final do Certame</p>
                    <p className="text-3xl font-black tracking-tight">{data.finalStatus}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider border-b border-slate-200 pb-2">Fundamentação Técnica Final</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {data.finalNotes || "Sem parecer adicional inserido."}
                  </p>
                </div>

                {/* Signature Area */}
                <div className="mt-24 flex justify-between items-end border-t border-slate-200 pt-8">
                  <div className="text-[10px] text-slate-400">
                    <p>Este relatório foi gerado automaticamente pelo Sistema Tech Analyst Pro.</p>
                    <p>Código de Autenticação: {Math.random().toString(36).substr(2, 12).toUpperCase()}</p>
                  </div>
                  <div className="text-center w-64 border-t-2 border-slate-800 pt-4">
                    <p className="text-sm font-bold text-slate-800">{data.responsible}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Assinatura do Analista Responsável</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 py-6 px-8 mt-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> RL Informática - Compliance</span>
            <span className="flex items-center gap-1"><History className="w-3 h-3" /> Auditoria Técnica de TI</span>
          </div>
          <div>© {new Date().getFullYear()} RL Informática - Tecnologia é nosso mundo</div>
        </div>
      </footer>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text" }: { label: string, value: string, onChange: (v: string) => void, type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#000080]/10 focus:border-[#000080] outline-none transition-all"
      />
    </div>
  );
}

function PdfInfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
