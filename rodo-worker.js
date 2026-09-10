// rodo-worker.js — roda em thread separada, não trava a interface
importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
importScripts('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');

self.onmessage = function(e) {
  const { tipo, payload } = e.data;
  if (tipo !== 'PROCESSAR_PLANILHA') return;

  try {
    self.postMessage({ tipo: 'PROGRESSO', msg: 'Lendo arquivo...', pct: 10 });
    const wb = XLSX.read(payload.buffer, { type: 'array', cellDates: true, dense: false });

    self.postMessage({ tipo: 'PROGRESSO', msg: 'Processando registros...', pct: 40 });
    const nomePlanilha = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[nomePlanilha], { defval: '' });

    self.postMessage({ tipo: 'PROGRESSO', msg: `${rows.length.toLocaleString('pt-BR')} registros. Agregando...`, pct: 70 });
    const agg = { total: rows.length, porUnidade:{}, porCliente:{}, porMes:{} };
    for (const r of rows) {
      const uni = (r['Unidade']||r['unidade']||'').toString().trim();
      const cli = (r['Cliente']||r['cliente']||'').toString().trim();
      const mes = (r['Mes']||r['mês']||'').toString().trim();
      if (uni) agg.porUnidade[uni] = (agg.porUnidade[uni]||0)+1;
      if (cli) agg.porCliente[cli] = (agg.porCliente[cli]||0)+1;
      if (mes) agg.porMes[mes] = (agg.porMes[mes]||0)+1;
    }

    self.postMessage({ tipo: 'PROGRESSO', msg: 'Comprimindo para salvar...', pct: 90 });
    const json = JSON.stringify(rows);
    const compressed = btoa(String.fromCharCode(...pako.deflate(new TextEncoder().encode(json))));

    self.postMessage({ tipo: 'CONCLUIDO', rows, compressed, agg, totalRegistros: rows.length });
  } catch (err) {
    self.postMessage({ tipo: 'ERRO', msg: err.message });
  }
};
