"use client"
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import CryptoJS from 'crypto-js';
import { motion } from 'framer-motion';
import {Star} from 'lucide-react'; // Importing the Star icon from lucide-react

const TopCreatorsChart = () => {
  const [creatorData, setCreatorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('bar');
  const [message, setMessage] = useState('');

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
  const fetchCreatorData = async () => {
    const encryptedUserData = sessionStorage.getItem('user');
    let userId = null;

    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decrypted);
        userId = user?.userId || null;
      } catch (e) {
        console.error('Decryption error:', e);
      }
    }

    if (!userId) {
      setMessage('User ID missing.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/dashBoard1/Form/creatorWiseForm', {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'loggedInUserId': userId,
        },
        cache: 'no-store',
      });

      const result = await res.json();

      if (res.ok && result?.data) {
        setCreatorData(result.data);
        setMessage('');
      } else {
        setMessage(result.message || 'No data found.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Something went wrong!');
    } finally {
      setLoading(false);
    }
  };
    fetchCreatorData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md">
          <strong>{label}</strong>: {payload[0].value} forms
        </div>
      );
    }
    return null;
  };

  return (
     <motion.div
          className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl shadow-md border border-border w-full max-w-[400px] hover:shadow-lg transition-all duration-300"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
      <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-indigo-700 flex items-center gap-1">
  <Star className="w-5 h-5 text-yellow-500" />
  Top Creators
</h2>
        <div className="flex space-x-1">
          {['bar', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2 py-0.5 text-xs rounded-md font-medium ${
                viewMode === mode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-muted text-foreground hover:bg-secondary'
              }`}
            >
              {mode === 'bar' ? 'Bar' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[150px] flex items-center justify-center text-muted-foreground">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : message ? (
        <div className="text-sm text-destructive bg-red-50 p-2 rounded-md">{message}</div>
      ) : creatorData.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data available.</div>
      ) : viewMode === 'bar' ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={creatorData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="CreatorName"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="FormCount"
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              barSize={12}
              animationDuration={700}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ul className="space-y-1 max-h-[180px] overflow-y-auto">
          {creatorData.map((item, idx) => (
            <motion.li
              key={idx}
              className="flex justify-between items-center p-2 bg-muted rounded-md text-sm shadow-sm hover:bg-indigo-50"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <span className="text-foreground">{item.CreatorName}</span>
              <span className="text-indigo-600 font-medium">{item.FormCount} forms</span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

export default TopCreatorsChart;

