"use client"
import React, { useEffect, useState } from 'react';
import CryptoJS from 'crypto-js';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { BarChart } from 'lucide-react';

const FormVersionTracker = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const formsPerPage = 5;

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
 useEffect(() => {
  const fetchData = async () => {
    let userRole = null;

    const encryptedUserData = sessionStorage.getItem('user');
    if (encryptedUserData) {
      try {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(decryptedData);
        userRole = user?.userId || null;
      } catch (error) {
        console.error('Error decrypting user data:', error);
      }
    }

    if (!userRole) {
      console.warn('User ID missing');
      setMessage('User not found');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/dashBoard1/Form/formVersionTracker', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_TOKEN}`,
          loggedInUserId: userRole,
        },
        cache: 'no-store',
      });

      const result = await res.json();

      if (res.ok && Array.isArray(result.data)) {
        const normalized = result.data
          .map((item) => ({
            FormName: item.FormName || item.formName || item.form_name || 'Unknown Form',
            CurrentVersion: item.CurrentVersion || item.currentVersion || item.version || 0,
          }))
          .filter((item) => item.FormName && item.CurrentVersion > 0)
          .sort((a, b) => b.CurrentVersion - a.CurrentVersion);

        setData(normalized);
        setMessage('');
      } else {
        setMessage(result.message || 'No version data found');
      }
    } catch (error) {
      console.error('API error:', error);
      setMessage('Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(data.length / formsPerPage);
  const currentForms = data.slice(
    (currentPage - 1) * formsPerPage,
    currentPage * formsPerPage
  );

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white shadow-md rounded-lg p-4 border border-border hover:shadow-lg transition-all duration-300 h-full">
  <h2 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-1">
  <BarChart className="w-5 h-5 text-primary" />
  High Version Forms Tracker
</h2>

  {loading ? (
    <div className="text-center py-3 text-muted-foreground text-sm">Loading...</div>
  ) : message ? (
    <div className="text-center py-3 text-destructive text-sm font-medium bg-red-100 rounded-lg">
      {message} <button className="ml-2 text-primary hover:underline">Retry</button>
    </div>
  ) : currentForms.length === 0 ? (
    <div className="text-center py-3 text-muted-foreground text-sm">No forms available</div>
  ) : (
    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
      {currentForms.map((form, index) => (
        <div
          key={index}
          className={`${
            index % 2 === 0 ? 'bg-card' : 'bg-muted'
          } p-2 rounded-lg border border-border hover:bg-muted transition-all duration-200 mb-1`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                {form.FormName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary font-semibold">v{form.CurrentVersion}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}

  {data.length > formsPerPage && (
    <div className="flex justify-between items-center mt-3 text-xs">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
          currentPage === 1
            ? 'bg-secondary text-muted-foreground cursor-not-allowed'
            : 'bg-blue-700 text-white hover:bg-blue-800'
        }`}
      >
        <FaArrowLeft className="w-4 h-4" />
        Prev
      </button>

      <span className="text-foreground">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
          currentPage === totalPages
            ? 'bg-secondary text-muted-foreground cursor-not-allowed'
            : 'bg-blue-700 text-white hover:bg-blue-800'
        }`}
      >
        Next
        <FaArrowRight className="w-4 h-4" />
      </button>
    </div>
  )}
</div>
  );
};

export default FormVersionTracker;
