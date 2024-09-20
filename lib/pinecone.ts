import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { downloadFromS3 } from './s3-server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter, Document } from '@pinecone-database/doc-splitter';
import { getEmbeddings } from './embedings';
import md5 from 'md5';
import { convertToAscii } from './utils';

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

export async function loadS3IntoPinecone(fileKey: string) {
  // obtain the pdf -> downlaod and read from pdf
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error('could not download file from s3');
  }

  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  // split and segment the pdf
  const documents = await Promise.all(pages.map(prepareDocument));
  // vectorise and embed individual documents

  const vectors = await Promise.all(documents.flat().map(embedDocument));

    // upload to pinecone

  const client = await getPineconeClient();
  const pineconeIndex = await client.index('chatpdf');
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

  console.log('inserting vectors into pinecone');
  await namespace.upsert(vectors);

  return documents[0];
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, maxBytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder('utf-8').decode(enc.encode(str).slice(0, maxBytes));
};

export async function prepareDocument(page: PDFPage) {
  //doc splitter
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, ' ');

  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
