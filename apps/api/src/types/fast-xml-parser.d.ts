declare module "fast-xml-parser" {
  export type XMLParserOptions = {
    ignoreAttributes?: boolean;
    attributeNamePrefix?: string;
    trimValues?: boolean;
    cdataPropName?: string;
  };

  export class XMLParser {
    constructor(options?: XMLParserOptions);
    parse(input: string): unknown;
  }
}
