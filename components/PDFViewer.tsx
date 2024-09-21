'use client';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Props = { pdf_url: string };

const PDFViewer: React.FC<Props> = ({ pdf_url }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const retryCount = useRef(0);
  const maxRetries = 10;
  const loadTimeout = 500;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let timerId: NodeJS.Timeout;

    const onLoad = () => {
      clearTimeout(timerId);
      setIsLoading(false);
    };

    const reloadIframe = () => {
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        setIsLoading(true);
        iframe.src = iframe.src;
        timerId = setTimeout(reloadIframe, loadTimeout);
      } else {
        setIsLoading(false); // Stop loading after max retries
      }
    };

    iframe.addEventListener('load', onLoad);
    timerId = setTimeout(reloadIframe, loadTimeout);

    return () => {
      clearTimeout(timerId);
      iframe.removeEventListener('load', onLoad);
    };
  }, [pdf_url]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <Loader2 className="h-6 w-6 text-slate-700 animate-spin" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={`https://docs.google.com/gview?url=${encodeURIComponent(pdf_url)}&embedded=true`}
        className={`w-full h-full ${isLoading ? 'invisible' : ''}`}
        title="PDF Viewer"
      />
    </div>
  );
};

export default PDFViewer;