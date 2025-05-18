import { promises as fs } from 'fs';
import * as path from 'path';
import FileTab from './FileTab'; // Make sure FileTab.ts is also converted to TS

export default class Branch {
  name: string;
  fileTabs: FileTab[];
  stashHash: string | null;

  constructor(name: string, stashHash: string | null = null) {
    this.name = name;
    this.fileTabs = [];
    this.stashHash = stashHash;
  }

  addFileTab(fileTab: FileTab): void {
    this.fileTabs.push(fileTab);
  }

  removeFileTab(fileTabPath: string): void {
    this.fileTabs = this.fileTabs.filter(fileTab => fileTab.path !== fileTabPath);
  }

  async save(storageDir: string): Promise<void> {
    const filePath = path.join(storageDir, `${this.name}.json`);
    const data = {
      name: this.name,
      fileTabs: this.fileTabs.map(file => file.toObject()),
      stashHash: this.stashHash
    };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  static async load(storageDir: string, name: string): Promise<Branch> {
    const filePath = path.join(storageDir, `${name}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    const branch = new Branch(data.name, data.stashHash);
    branch.fileTabs = data.fileTabs.map(FileTab.fromObject);
    return branch;
  }
}
