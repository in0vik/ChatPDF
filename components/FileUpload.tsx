'use client';
import { uploadToS3 } from '@/lib/s3';
import { useMutation } from '@tanstack/react-query';
import { Inbox, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type Props = {};

const FileUpload = (props: Props) => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const { mutate, isPending } = useMutation({
    mutationFn: async ({ file_key, file_name }: { file_key: string; file_name: string }) => {
      const response = await axios.post('/api/create-chat', { file_key, file_name });
      console.log(response);
      return response.data;
    },
  });
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file?.size > 10 * 1024 * 1024) {
        toast.error('File is too large');
        return;
      }

      try {
        setIsUploading(true);
        const data = await uploadToS3(file);
        if (!data?.file_key || !data?.file_name) {
          toast.error('Error uploading file');
          return;
        }

        mutate(data, {
          onSuccess: ({ chat_id }) => {
            toast.success("Chat created!");
            router.push(`/chat/${chat_id}`);
          },
          onError: () => {
            toast.error('Error creating chat');
          },
        });
      } catch (error) {
        console.log(error);
        toast.error('Error uploading file');
      } finally {
        setIsUploading(false);
      }
    },
  });
  return (
    <div className="p-2 bg-white rounded-xl">
      <div
        {...getRootProps({
          className:
            'border-dashed border-2 py-8 rounded-xl bg-gray-50 flex justify-center items-center flex-col',
        })}>
        <input {...getInputProps()} />
        {isPending || isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin"></Loader2>
            <p className="mt-2 text-sm text-slate-400">Spinning to GPT...</p>
          </>
        ) : (
          <>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-400">Drop PDF Here</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
