"use client"

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import CryptoJS from 'crypto-js';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TopContributorsChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('bar');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  useEffect(() => {
    const fetchContributors = async () => {
      const encryptedUserData = sessionStorage.getItem('user');
      let userId = null;
  
      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decrypted);
          userId = user?.userId || null;
        } catch (e) {
          setError('Decryption error. Unable to fetch user data.');
          console.error('Decryption error:', e);
        }
      }
  
      if (!userId) {
        setMessage('User ID missing.');
        setLoading(false);
        return;
      }
  
      try {
        const res = await fetch('/api/dashBoard1/usersM/getTopUserContributors', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
            'loggedInUserId': userId,
          },
          cache: 'no-store',
        });
  
        const result = await res.json();
  
        if (res.ok && result?.createdBy && result?.modifiedBy) {
          const mergedData = [...result.createdBy, ...result.modifiedBy];
  
          const aggregatedData = mergedData.reduce((acc, curr) => {
            const existing = acc.find(item => item.UserId === curr.UserId);
            const displayName = `${curr.UserName} (${curr.UserId})`;
  
            if (existing) {
              if (curr.ActionType === 'CreatedBy') {
                existing.total_created += curr.ActionCount;
              } else if (curr.ActionType === 'ModifiedBy') {
                existing.total_modified += curr.ActionCount;
              }
            } else {
              acc.push({
                UserId: curr.UserId,
                contributor: displayName,
                total_created: curr.ActionType === 'CreatedBy' ? curr.ActionCount : 0,
                total_modified: curr.ActionType === 'ModifiedBy' ? curr.ActionCount : 0,
              });
            }
  
            return acc;
          }, []);
  
          setData(aggregatedData);
          setMessage('');
        } else {
          setMessage(result.message || 'No data found.');
        }
      } catch (error) {
        setError('Failed to fetch data.');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContributors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 text-white text-xs p-2 rounded shadow-lg">
          <strong className="block mb-1">{label}</strong>
          <div>🟦 Created: {payload[0].value}</div>
          <div>🟩 Modified: {payload[1].value}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-md border border-border w-full max-w-[500px] hover:shadow-xl transition-all duration-300 h-[320px] overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-1 mb-2 sm:mb-0">
          <Star className="w-5 h-5 text-yellow-500" />
          Top Contributors
        </h2>
        <div className="flex space-x-1">
          {['bar', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors duration-200 ${
                viewMode === mode
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-muted text-foreground hover:bg-indigo-200'
              }`}
            >
              {mode === 'bar' ? 'Bar' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[150px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="text-sm text-destructive bg-red-100 p-3 rounded-md shadow-md">{error}</div>
      ) : message ? (
        <div className="text-sm text-orange-700 bg-orange-100 p-3 rounded-md shadow-md">{message}</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-muted-foreground">No contributors data available.</div>
      ) : viewMode === 'bar' ? (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="contributor"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="total_created"
              stackId="a"
              fill="url(#colorCreated)"
              barSize={16}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="total_modified"
              stackId="a"
              fill="url(#colorModified)"
              barSize={16}
              radius={[0, 0, 0, 0]}
            />
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="2" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="colorModified" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ul className="space-y-3 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-transparent pr-2">
          {data.map((item, idx) => (
            <motion.li
              key={idx}
              className="flex justify-between items-center px-4 py-3 bg-card border border-indigo-100 rounded-lg shadow-md hover:shadow-xl transition transform hover:scale-[1.02]"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <span className="text-foreground font-medium">{item.contributor}</span>
              <span className="text-sm text-indigo-700">
                {item.total_created} 🟦 / {item.total_modified} 🟩
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

export default TopContributorsChart;

