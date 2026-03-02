'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';

interface KeyDecision {
  id: string;
  decision: string;
}

interface ActionItem {
  id: string;
  action: string;
  description: string;
  responsible: string;
  dueDate: string;
  status: string;
}

interface ReportData {
  meetingId: string;
  summary: string;
  keyDecisions: KeyDecision[];
  actionItems: ActionItem[];
  recommendations: string;
}

export default function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  
  const [reportData, setReportData] = useState<ReportData>({
    meetingId: '',
    summary: '',
    keyDecisions: [{ id: '1', decision: '' }],
    actionItems: [
      {
        id: '1',
        action: '',
        description: '',
        responsible: '',
        dueDate: '',
        status: 'Pending',
      }
    ],
    recommendations: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
    if (status === 'authenticated') {
      fetchMeeting();
    }
  }, [status]);

  const fetchMeeting = async () => {
    try {
      const response = await fetch(`/api/meetings/${resolvedParams.id}`);
      if (!response.ok) throw new Error('Failed to fetch meeting');
      
      const data = await response.json();
      setMeeting(data);
      
      // Load existing report if available
      if (data.description) {
        try {
          const parsed = JSON.parse(data.description);
          if (parsed.savedReports && parsed.savedReports.length > 0) {
            const latestReport = parsed.savedReports[parsed.savedReports.length - 1];
            if (latestReport.summary || latestReport.keyDecisions || latestReport.actionItems) {
              setReportData({
                meetingId: resolvedParams.id,
                summary: latestReport.summary || '',
                keyDecisions: latestReport.keyDecisions || [{ id: '1', decision: '' }],
                actionItems: latestReport.actionItems || [
                  {
                    id: '1',
                    action: '',
                    description: '',
                    responsible: '',
                    dueDate: '',
                    status: 'Pending',
                  }
                ],
                recommendations: latestReport.recommendations || '',
              });
            }
          }
        } catch (e) {
          console.log('No saved reports found');
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      setLoading(false);
    }
  };

  const handleAddKeyDecision = () => {
    setReportData({
      ...reportData,
      keyDecisions: [
        ...reportData.keyDecisions,
        { id: Date.now().toString(), decision: '' }
      ],
    });
  };

  const handleRemoveKeyDecision = (id: string) => {
    setReportData({
      ...reportData,
      keyDecisions: reportData.keyDecisions.filter(item => item.id !== id),
    });
  };

  const handleKeyDecisionChange = (id: string, value: string) => {
    setReportData({
      ...reportData,
      keyDecisions: reportData.keyDecisions.map(item =>
        item.id === id ? { ...item, decision: value } : item
      ),
    });
  };

  const handleAddActionItem = () => {
    setReportData({
      ...reportData,
      actionItems: [
        ...reportData.actionItems,
        {
          id: Date.now().toString(),
          action: '',
          description: '',
          responsible: '',
          dueDate: '',
          status: 'Pending',
        }
      ],
    });
  };

  const handleRemoveActionItem = (id: string) => {
    setReportData({
      ...reportData,
      actionItems: reportData.actionItems.filter(item => item.id !== id),
    });
  };

  const handleActionItemChange = (id: string, field: keyof ActionItem, value: string) => {
    setReportData({
      ...reportData,
      actionItems: reportData.actionItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const handleSubmitReport = async () => {
    // Validate that at least summary has content
    if (!reportData.summary.trim()) {
      alert('Please add a summary before submitting the report.');
      return;
    }

    setSaving(true);
    try {
      // Get existing saved reports
      let existingSavedReports: any[] = [];
      if (meeting?.description) {
        try {
          const parsed = JSON.parse(meeting.description);
          if (parsed.savedReports && Array.isArray(parsed.savedReports)) {
            existingSavedReports = parsed.savedReports;
          }
        } catch (e) {
          // Not JSON
        }
      }

      const newSavedReport = {
        id: Date.now().toString(),
        meetingId: resolvedParams.id,
        summary: reportData.summary,
        keyDecisions: reportData.keyDecisions.filter(d => d.decision.trim()),
        actionItems: reportData.actionItems.filter(a => a.action.trim()),
        recommendations: reportData.recommendations,
        submitted: true,
        submittedAt: new Date().toISOString(),
      };

      const updatedSavedReports = [...existingSavedReports, newSavedReport];

      // Save to meeting description
      const response = await fetch(`/api/meetings/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: JSON.stringify({ savedReports: updatedSavedReports }),
        }),
      });

      if (response.ok) {
        alert('Report submitted successfully!');
        router.push('/reports');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to submit report.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900">New Report</h2>
          <button
            onClick={() => router.push('/reports')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitReport(); }} className="p-6 space-y-5">
          {/* Meeting Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={meeting?.title || ''}
              disabled
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-gray-50"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reportData.summary}
              onChange={(e) => setReportData({ ...reportData, summary: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter meeting summary..."
            />
          </div>

          {/* Key Decisions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Key Decisions
              </label>
              <button
                type="button"
                onClick={handleAddKeyDecision}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            <div className="space-y-3">
              {reportData.keyDecisions.map((item, index) => (
                <div key={item.id} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={item.decision}
                    onChange={(e) => handleKeyDecisionChange(item.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Decision ${index + 1}`}
                  />
                  {reportData.keyDecisions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyDecision(item.id)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Action Items
              </label>
              <button
                type="button"
                onClick={handleAddActionItem}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            <div className="space-y-4">
              {reportData.actionItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Action {index + 1}</span>
                    {reportData.actionItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveActionItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Action</label>
                    <input
                      type="text"
                      value={item.action}
                      onChange={(e) => handleActionItemChange(item.id, 'action', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Action title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Description</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => handleActionItemChange(item.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                      placeholder="Action description"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Responsible</label>
                      <input
                        type="text"
                        value={item.responsible}
                        onChange={(e) => handleActionItemChange(item.id, 'responsible', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Person"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => handleActionItemChange(item.id, 'dueDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Status</label>
                      <select
                        value={item.status}
                        onChange={(e) => handleActionItemChange(item.id, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recommendations
            </label>
            <textarea
              value={reportData.recommendations}
              onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter recommendations..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-3 bg-blue-400 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? 'Creating Report...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
