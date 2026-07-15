"use client"
import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';  

export default function StrictFormsLeaderboard() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  useEffect(() => {
  const fetchTopForms = async () => {
    try {
      setLoading(true);

      const encryptedUser = sessionStorage.getItem('user');
      let userId = null;

      if (encryptedUser) {
        const CryptoJS = (await import('crypto-js')).default;
        const bytes = CryptoJS.AES.decrypt(encryptedUser, process.env.NEXT_PUBLIC_ENCRYPT_SECRET || '');
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        const parsed = JSON.parse(decrypted);
        userId = parsed?.userId;
      }

      if (!userId) {
        setMessage('User not found');
        return;
      }

      const res = await fetch('/api/dashBoard1/Form/top5StrictForms', {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          loggedInUserId: userId,
        },
        cache: 'no-store',
      });

      const json = await res.json();

      if (res.ok) {
        setForms(json.data || []);
        setMessage(json.data?.length ? '' : 'No forms found.');
      } else {
        setMessage(json.message || 'Failed to fetch.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  
    fetchTopForms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-xl shadow-md border border-border w-full max-w-[380px] h-[380px] flex flex-col hover:shadow-lg transition-all duration-300">
       <h2 className="text-base font-semibold text-indigo-700 mb-3 flex items-center gap-1.5">
  <CircleAlert className="w-4 h-4 text-yellow-500" />
  Top 5 Strictest Forms
</h2>

      <div className="flex-1 overflow-y-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : message ? (
          <div className="text-center text-sm text-muted-foreground py-4">{message}</div>
        ) : (
          <ol className="space-y-1">
            {forms.map((form, index) => (
              <li
                key={form.form_id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-card border border-border hover:bg-indigo-50 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-1.5">
                  <div className="text-base font-bold text-indigo-700 w-5 text-center">#{index + 1}</div>
                  <div className="max-w-[180px]">
                    <p className="text-sm font-medium text-foreground truncate">{form.form_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Score: <strong>{form.passing_score}</strong> / {form.max_score}
                    </p>
                    <p className="text-xs text-red-500 font-medium">
                      Strictness: {form.passing_percentage?.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right leading-tight">
                  <p className="font-medium">Created</p>
                  <p>
                    {form.created_on
                      ? new Date(form.created_on).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
