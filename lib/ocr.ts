import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} from '@aws-sdk/client-textract';
import { PDFPage } from './pinecone';

import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

async function getCallerIdentity() {
  const stsClient = new STSClient({ region: 'us-east-1' });
  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);
  console.log("🚀 Caller Identity: ", response);
}

getCallerIdentity();

export async function extractTextFromS3PDF(
  bucketName: string,
  documentKey: string
): Promise<PDFPage[]> {
  const client = new TextractClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
    },
  });

  const startCommand = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: bucketName,
        Name: documentKey,
      },
    },
  });

  const startResponse = await client.send(startCommand);

  const jobId = startResponse.JobId;
  if (!jobId) {
    throw new Error('Failed to start text detection job.');
  }

  // Wait for the job to complete
  let jobStatus = '';
  do {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const getParams = { JobId: jobId };
    const getCommand = new GetDocumentTextDetectionCommand(getParams);
    const getResponse = await client.send(getCommand);
    jobStatus = getResponse.JobStatus || '';

    if (jobStatus === 'FAILED') {
      throw new Error('Text detection job failed.');
    }
  } while (jobStatus !== 'SUCCEEDED');

  // Retrieve and organize text by page
  let nextToken: string | undefined = undefined;
  const pageTexts = new Map<number, string>();

  do {
    const getParams = {
      JobId: jobId,
      NextToken: nextToken,
    };
    const getCommand: GetDocumentTextDetectionCommand = new GetDocumentTextDetectionCommand(
      getParams
    );
    const getResponse = await client.send(getCommand);

    const blocks = getResponse.Blocks;
    if (blocks) {
      for (const block of blocks) {
        if (block.BlockType === 'LINE' && block.Text && block.Page) {
          const pageNumber = block.Page;
          const existingText = pageTexts.get(pageNumber) || '';
          pageTexts.set(pageNumber, existingText + block.Text + '\n');
        }
      }
    }
    nextToken = getResponse.NextToken;
  } while (nextToken);

  // Construct the array of PDFPage objects
  const pdfPages: PDFPage[] = Array.from(pageTexts.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, pageContent]) => ({
      pageContent,
      metadata: {
        loc: { pageNumber },
      },
    }));

  return pdfPages;
}
