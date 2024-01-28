import { ConfigReader } from './configReader';

interface infraConfig {
    name: string;
}

export class InfraConfig extends ConfigReader<infraConfig> {
    constructor(filePath: string) {
        super(filePath);
    }
}