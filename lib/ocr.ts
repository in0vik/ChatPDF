import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} from '@aws-sdk/client-textract';
import { PDFPage } from './pinecone';

export async function extractTextFromS3PDF(
  bucketName: string,
  documentKey: string
): Promise<PDFPage[]> {
  const client = new TextractClient({ region: process.env.AWS_S3_REGION! });

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
