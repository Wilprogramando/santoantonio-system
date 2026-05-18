import Dexie, { Table } from 'dexie';
import { Hino, Repertorio, Configuracoes, HarpaItem } from '../types';

export class RepertorioIgrejaDB extends Dexie {
  hinos!: Table<Hino>;
  repertorios!: Table<Repertorio>;
  configuracoes!: Table<Configuracoes>;
  harpa!: Table<HarpaItem>;

  constructor() {
    super('RepertorioIgreja');
    this.version(1).stores({
      hinos: '&id, tipo, categoria',
      repertorios: '&id, data',
      configuracoes: '&id',
      harpa: '&numero, nome'
    });
  }
}

export const db = new RepertorioIgrejaDB();

const harpaCristaBase: HarpaItem[] = [
  { numero: 1, nome: 'Jesus, que Luz Brilhou' },
  { numero: 2, nome: 'Eu Ouço a Voz de Jesus' },
  { numero: 3, nome: 'Bem-vindo ao Lar' },
  { numero: 4, nome: 'Há Paz, Há Paz' },
  { numero: 5, nome: 'Já Fui Achado por Cristo' },
  { numero: 6, nome: 'Bênçãos, Bênçãos' },
  { numero: 7, nome: 'Que Deus Abençoe a Todos Nós' },
  { numero: 8, nome: 'Adoro a Cristo, Meu Senhor' },
  { numero: 9, nome: 'Glória a Deus' },
  { numero: 10, nome: 'Eu Sou Muito Feliz' },
];

export async function initializeHarpaBase() {
  const count = await db.harpa.count();
  if (count === 0) {
    await db.harpa.bulkAdd(harpaCristaBase);
  }
}

export async function getHarpaByNumber(numero: number): Promise<HarpaItem | undefined> {
  return db.harpa.get(numero);
}

export async function getAllHarpa(): Promise<HarpaItem[]> {
  return db.harpa.toArray();
}

export async function addOrUpdateHarpa(item: HarpaItem) {
  return db.harpa.put(item);
}

export async function addHino(hino: Hino) {
  return db.hinos.add(hino);
}

export async function updateHino(hino: Hino) {
  return db.hinos.update(hino.id, hino);
}

export async function deleteHino(id: string) {
  return db.hinos.delete(id);
}

export async function getHino(id: string) {
  return db.hinos.get(id);
}

export async function getAllHinos() {
  return db.hinos.toArray();
}

export async function getHinosByType(tipo: 'comum' | 'harpa') {
  return db.hinos.where('tipo').equals(tipo).toArray();
}

export async function addRepertorio(repertorio: Repertorio) {
  return db.repertorios.add(repertorio);
}

export async function updateRepertorio(repertorio: Repertorio) {
  return db.repertorios.update(repertorio.id, repertorio);
}

export async function deleteRepertorio(id: string) {
  return db.repertorios.delete(id);
}

export async function getRepertorio(id: string) {
  return db.repertorios.get(id);
}

export async function getAllRepertorios() {
  const all = await db.repertorios.toArray();
  return all.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

export async function getConfiguracoes() {
  const config = await db.configuracoes.toArray();
  return config[0] || null;
}

export async function saveConfiguracoes(config: Configuracoes) {
  config.id = 'config';
  return db.configuracoes.put(config);
}

export async function exportData() {
  const hinos = await db.hinos.toArray();
  const repertorios = await db.repertorios.toArray();
  const configuracoes = await db.configuracoes.toArray();
  const harpa = await db.harpa.toArray();

  return {
    hinos,
    repertorios,
    configuracoes,
    harpa
  };
}

export async function importData(data: any) {
  await db.transaction('rw', db.hinos, db.repertorios, db.configuracoes, db.harpa, async () => {
    if (data.hinos && Array.isArray(data.hinos)) {
      await db.hinos.clear();
      await db.hinos.bulkAdd(data.hinos);
    }
    if (data.repertorios && Array.isArray(data.repertorios)) {
      await db.repertorios.clear();
      await db.repertorios.bulkAdd(data.repertorios);
    }
    if (data.configuracoes && Array.isArray(data.configuracoes)) {
      await db.configuracoes.clear();
      await db.configuracoes.bulkAdd(data.configuracoes);
    }
    if (data.harpa && Array.isArray(data.harpa)) {
      await db.harpa.clear();
      await db.harpa.bulkAdd(data.harpa);
    }
  });
}

export async function clearAllData() {
  await db.transaction('rw', db.hinos, db.repertorios, db.configuracoes, async () => {
    await db.hinos.clear();
    await db.repertorios.clear();
    await db.configuracoes.clear();
  });
}

export async function importHinosFromCSV(csvContent: string): Promise<{ success: number; errors: string[] }> {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  let success = 0;

  // Remover cabeçalho se existir
  const dataLines = lines.slice(1);

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    try {
      // Dividir por tabulação ou vírgula
      const cells = line.includes('\t') 
        ? line.split('\t').map(c => c.trim())
        : line.split(',').map(c => c.trim());

      if (cells.length < 3) {
        errors.push(`Linha ${i + 2}: Formato inválido. Esperado: Número\tNome\tLetra`);
        continue;
      }

      const numero = parseInt(cells[0]);
      const nome = cells[1];
      const letra = cells[2];

      if (isNaN(numero)) {
        errors.push(`Linha ${i + 2}: Número deve ser um inteiro.`);
        continue;
      }

      if (!nome || !letra) {
        errors.push(`Linha ${i + 2}: Nome ou letra em branco.`);
        continue;
      }

      // Verificar se já existe
      const existente = await getHino(numero.toString());
      
      const novoHino: Hino = {
        id: numero.toString(),
        nome,
        letra,
        numeroHarpa: numero,
        tom: 'C',
        cantor: 'A definir',
        categoria: 'Harpa',
        tipo: 'harpa',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };

      if (existente) {
        await updateHino(novoHino);
      } else {
        await addHino(novoHino);
      }

      success++;
    } catch (error) {
      errors.push(`Linha ${i + 2}: ${(error as Error).message}`);
    }
  }

  return { success, errors };
}
