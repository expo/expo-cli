/// <reference types="react" />
import NextDocument from 'next/document';

export declare const style: string;

export declare function getInitialProps({ renderPage }: { renderPage: any }): Promise<any>;

export declare class Document extends NextDocument {
  static getInitialProps: typeof getInitialProps;
  render(): JSX.Element;
}

export default Document;
