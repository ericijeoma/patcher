import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";

// Mock API call - replace with actual API call
const fetchScanHistory = async () => {
  // Mock data
  return {
    scans: [
      {
        id: "scan1",
        filename: "malware_sample.exe",
        date: "2023-06-20T10:30:00Z",
        risk_score: 85,
        status: "completed",
        file_size: "2.4 MB",
        file_type: "PE32 executable",
      },
      {
        id: "scan2",
        filename: "document.pdf",
        date: "2023-06-19T14:45:00Z",
        risk_score: 15,
        status: "completed",
        file_size: "1.2 MB",
        file_type: "PDF document",
      },
      {
        id: "scan3",
        filename: "suspicious_script.js",
        date: "2023-06-18T09:15:00Z",
        risk_score: 68,
        status: "completed",
        file_size: "45 KB",
        file_type: "JavaScript",
      },
      {
        id: "scan4",
        filename: "clean_file.txt",
        date: "2023-06-17T16:20:00Z",
        risk_score: 5,
        status: "completed",
        file_size: "2 KB",
        file_type: "Text file",
      },
    ],
  };
};

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["scanHistory"],
    queryFn: fetchScanHistory,
  });

  const filteredScans = historyData?.scans.filter((scan) => {
    const matchesSearch = scan.filename
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "high" && scan.risk_score >= 70) ||
      (filterStatus === "medium" &&
        scan.risk_score >= 40 &&
        scan.risk_score < 70) ||
      (filterStatus === "low" && scan.risk_score < 40);

    return matchesSearch && matchesFilter;
  });

  const getRiskColor = (score: number) => {
    if (score >= 70)
      return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400";
    if (score >= 40)
      return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400";
    return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400";
  };

  const getStatusColor = (status: string) => {
    if (status === "completed")
      return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400";
    if (status === "failed")
      return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400";
    return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle
                className="h-5 w-5 text-red-500 dark:text-red-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">
                Failed to load scan history
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Scan History
      </h1>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search
              className="h-5 w-5 text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            placeholder="Search by filename..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X
                className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk (≥70)</option>
            <option value="medium">Medium Risk (40-69)</option>
            <option value="low">Low Risk (&lt;40)</option>
          </select>
        </div>
      </div>

      {/* Scan History Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Scans
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredScans?.length || 0} results
          </span>
        </div>

        {filteredScans && filteredScans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Filename
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Risk Score
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    File Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Size
                  </th>
                  <th scope="col" className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredScans.map((scan) => (
                  <tr key={scan.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {scan.filename}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {scan.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(scan.date).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="inline h-4 w-4 mr-1" />
                        {new Date(scan.date).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRiskColor(scan.risk_score)}`}
                      >
                        {scan.risk_score}% Risk
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(scan.status)}`}
                      >
                        {scan.status.charAt(0).toUpperCase() +
                          scan.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {scan.file_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {scan.file_size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to="/report/$scanId"
                        params={{ scanId: scan.id }}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        View Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No scans found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm
                ? "No scans match your search criteria"
                : "Upload files to start analyzing"}
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FileText className="mr-2 h-4 w-4" />
                Upload Files
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
