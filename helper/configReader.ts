import * as fs from 'fs';
import * as yaml from 'js-yaml';


export abstract class ConfigReader<T> {
  private readonly objects : any;

  constructor(filePath: string) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const yamlObject = yaml.load(fileContents);
    this.objects = yamlObject;
  }

  getConfig(config?: string){
    if (config !== undefined) {
      return this.objects[config];
    } else {
      return this.objects;
    }
  }
}