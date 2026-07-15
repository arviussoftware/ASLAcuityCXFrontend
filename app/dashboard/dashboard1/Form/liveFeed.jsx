"use client";
import { useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import { Newspaper } from "lucide-react";

const filterOptions = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "last7days" },
  { label: "Last 30 Days", value: "last30days" },
];

const iconMap = {
  published: "✅",
  staged: "🧪",
  updated: "📝",
};

const getIcon = (label) => {
  const lower = label.toLowerCase();
  if (lower.includes("published")) return iconMap.published;
  if (lower.includes("staged")) return iconMap.staged;
  if (lower.includes("updated")) return iconMap.updated;
  return "📌";
};

const getBadgeColor = (label) => {
  const lower = label.toLowerCase();
  if (lower.includes("published")) return "bg-green-100 text-green-800";
  if (lower.includes("staged")) return "bg-yellow-100 text-yellow-800";
  if (lower.includes("updated")) return "bg-blue-100 text-blue-800";
  return "bg-muted text-muted-foreground";
};

export default function LiveFeed() {
  const [feed, setFeed] = useState([]);
  const [filter, setFilter] = useState("today");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
  const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPT_SECRET || "";

  useEffect(() => {
    const fetchData = async (filterType) => {
      const encryptedUserData = sessionStorage.getItem("user");
      let userRole = null;

      if (encryptedUserData) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, SECRET_KEY);
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userRole = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      let timezone = null;
      const encryptedTimezone = sessionStorage.getItem("selectedTimezone");

      if (encryptedTimezone) {
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedTimezone, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          timezone = JSON.parse(decryptedData);
        } catch (err) {
          console.error("Failed to decrypt timezone:", err);
        }
      }

      if (!userRole) {
        setMessage("User ID missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `/api/dashBoard1/Form/liveFeed?filterType=${filterType}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_TOKEN}`,
              loggedInUserId: userRole,
              timezone,
            },
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (res.ok) {
          setFeed(json.data || []);
          setMessage(
            json.data?.length ? "" : "No activity found in this period."
          );
        } else {
          setFeed([]);
          setMessage(json.message || "Failed to fetch feed.");
        }
      } catch (error) {
        console.error("Error fetching feed:", error);
        setMessage("Something went wrong!");
      } finally {
        setLoading(false);
      }
    };

    fetchData(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="bg-card p-4 rounded-xl shadow-md border border-border w-full max-w-[600px] h-[397px] flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          Live Feed
        </h2>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="px-3 py-1 text-xs bg-muted text-foreground rounded-md shadow-sm hover:bg-secondary focus:outline-none"
          >
            {filterOptions.find((opt) => opt.value === filter)?.label}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-card shadow-lg rounded-md border border-border z-10">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilter(option.value);
                    setDropdownOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-sm text-foreground hover:bg-muted focus:outline-none"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-6 w-6 border-t-2 border-blue-600 rounded-full"></div>
          </div>
        ) : message ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            {message}
          </div>
        ) : (
          <ul className="space-y-2">
            {feed.map((item, index) => (
              <li
                key={index}
                className="flex items-start justify-between gap-2 px-3 py-2 bg-muted border rounded-md hover:shadow-sm hover:bg-muted transition"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">
                    {getIcon(item.activityLabel)}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {item.form_name}
                    </div>
                    <div
                      className={`text-[11px] inline-block mt-0.5 px-2 py-0.5 rounded ${getBadgeColor(
                        item.activityLabel
                      )}`}
                    >
                      {item.activityLabel}
                    </div>
                  </div>
                </div>
                {item.timestamp && (
                  <div className="text-[10px] text-right text-muted-foreground leading-tight mt-0.5 whitespace-nowrap">
                    <div>{new Date(item.timestamp).toLocaleDateString()}</div>
                    <div>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// 'use client';
// import { useEffect, useState } from 'react';
// import CryptoJS from 'crypto-js';

// const filterOptions = [
//   { label: 'Today', value: 'today' },
//   { label: 'Last 7 Days', value: 'last7days' },
//   { label: 'Last 30 Days', value: 'last30days' },
// ];

// const iconMap = {
//   published: '✅',
//   staged: '🧪',
//   updated: '📝',
// };

// const getIcon = (label) => {
//   const lower = label.toLowerCase();
//   if (lower.includes('published')) return iconMap.published;
//   if (lower.includes('staged')) return iconMap.staged;
//   if (lower.includes('updated')) return iconMap.updated;
//   return '📌';
// };

// const getBadgeColor = (label) => {
//   const lower = label.toLowerCase();
//   if (lower.includes('published')) return 'bg-green-100 text-green-800';
//   if (lower.includes('staged')) return 'bg-yellow-100 text-yellow-800';
//   if (lower.includes('updated')) return 'bg-blue-100 text-blue-800';
//   return 'bg-muted text-muted-foreground';
// };

// export default function LiveFeed() {
//   const [feed, setFeed] = useState([]);
//   const [filter, setFilter] = useState('today');
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState('');
//   const [dropdownOpen, setDropdownOpen] = useState(false);

//   const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;
//   const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPT_SECRET || '';

//   const fetchData = async (filterType) => {
//     const encryptedUserData = sessionStorage.getItem('user');
//     let userRole = null;

//     if (encryptedUserData) {
//       try {
//         const bytes = CryptoJS.AES.decrypt(encryptedUserData, SECRET_KEY);
//         const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
//         const user = JSON.parse(decryptedData);
//         userRole = user?.userId || null;
//       } catch (error) {
//         console.error('Error decrypting user data:', error);
//       }
//     }

//     if (!userRole) {
//       setMessage('User ID missing');
//       setLoading(false);
//       return;
//     }

//     try {
//       setLoading(true);
//       const res = await fetch(`/api/dashBoard1/liveFeed?filterType=${filterType}`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${API_TOKEN}`,
//           loggedInUserId: userRole,
//         },
//         cache: 'no-store',
//       });

//       const json = await res.json();

//       if (res.ok) {
//         setFeed(json.data || []);
//         setMessage(json.data?.length ? '' : 'No activity found in this period.');
//       } else {
//         setFeed([]);
//         setMessage(json.message || 'Failed to fetch feed.');
//       }
//     } catch (error) {
//       console.error('Error fetching feed:', error);
//       setMessage('Something went wrong!');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData(filter);
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filter]);

//   return (
//     <div className="bg-card p-4 rounded-xl shadow-md border border-border w-full max-w-[600px] h-[397px] flex flex-col">
//       <div className="flex justify-between items-center mb-3">
//         <h2 className= "text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
//           📰 Live Feed
//         </h2>
//         <div className="relative">
//           <button
//             onClick={() => setDropdownOpen(!dropdownOpen)}
//             className="px-3 py-1 text-xs bg-muted text-foreground rounded-md shadow-sm hover:bg-secondary focus:outline-none"
//           >
//             {filterOptions.find((opt) => opt.value === filter)?.label}
//           </button>

//           {dropdownOpen && (
//             <div className="absolute right-0 mt-2 w-40 bg-card shadow-lg rounded-md border border-border z-10">
//               {filterOptions.map((option) => (
//                 <button
//                   key={option.value}
//                   onClick={() => {
//                     setFilter(option.value);
//                     setDropdownOpen(false);
//                   }}
//                   className="block w-full px-4 py-2 text-sm text-foreground hover:bg-muted focus:outline-none"
//                 >
//                   {option.label}
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
//         {loading ? (
//           <div className="flex justify-center items-center h-full">
//             <div className="animate-spin h-6 w-6 border-t-2 border-blue-600 rounded-full"></div>
//           </div>
//         ) : message ? (
//           <div className="text-center text-sm text-muted-foreground py-10">{message}</div>
//         ) : (
//           <ul className="space-y-2">
//             {feed.map((item, index) => (
//               <li
//                 key={index}
//                 className="flex items-start justify-between gap-2 px-3 py-2 bg-muted border rounded-md hover:shadow-sm hover:bg-muted transition"
//               >
//                 <div className="flex items-start gap-2">
//                   <span className="text-lg mt-0.5">{getIcon(item.activityLabel)}</span>
//                   <div>
//                     <div className="text-sm font-medium text-foreground">{item.form_name}</div>
//                     <div
//                       className={`text-[11px] inline-block mt-0.5 px-2 py-0.5 rounded ${getBadgeColor(
//                         item.activityLabel
//                       )}`}
//                     >
//                       {item.activityLabel}
//                     </div>
//                   </div>
//                 </div>
//                 {item.timestamp && (
//                   <div className="text-[10px] text-right text-muted-foreground leading-tight mt-0.5 whitespace-nowrap">
//                     <div>{new Date(item.timestamp).toLocaleDateString()}</div>
//                     <div>
//                       {new Date(item.timestamp).toLocaleTimeString([], {
//                         hour: '2-digit',
//                         minute: '2-digit',
//                       })}
//                     </div>
//                   </div>
//                 )}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// }

