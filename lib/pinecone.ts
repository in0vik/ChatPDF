import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { RecursiveCharacterTextSplitter, Document } from '@pinecone-database/doc-splitter';
import { getEmbeddings } from './embedings';
import md5 from 'md5';
import { convertToAscii } from './utils';
import { extractTextFromS3PDF } from './ocr';

export type PDFPage = {
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
  
  const ocrResponse = await extractTextFromS3PDF(process.env.NEXT_PUBLIC_S3_BUCKET_NAME!, fileKey);

  // split and segment the pdf
  const documents = await Promise.all(ocrResponse.map(prepareDocument));
  // vectorize and embed individual documents

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
    console.log('error embedding document', error);
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
