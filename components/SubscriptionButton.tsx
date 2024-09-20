'use client';

import axios from 'axios';
import React, { useState } from 'react';
import { Button } from './ui/button';

type Props = {
  isPro?: boolean;
};

const SubscriptionButton = ({ isPro = false }: Props) => {
  const [isLoading, setLoading] = useState(false);
  const handleSubscription = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stripe');
      window.location.href = response.data.url;
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button onClick={handleSubscription} disabled={isLoading} variant="outline">
      {isPro ? 'Manage subscription' : 'Get Pro'}
    </Button>
  );
};

export default SubscriptionButton;
