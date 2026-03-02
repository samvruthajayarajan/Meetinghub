'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';

interface MinuteItem {
  id: string;
  topic: string;
  discussion: string;
  decision: string;
  actionItem: string;
  responsible: string;
  dueDate: string;
}

interface MinutesData {
  meetingId: string;
  attendees: string;
  minuteItems: MinuteItem[];
}

export default function MinutesPage({ params }: { params: Promise<{ id: string }> }) {
  const { status } = useSession();
  const router = useRouter();
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  
  const [minutesData, setMinutesData] = useState<MinutesData>({
    meetingId: '',
    attendees: '',
    minuteItems: [
      {
        id: '1',
        topic: '',
        discussion: '',
        decision: '',
        actionItem: '',
        responsible: '',
        dueDate: '',
      }
    ],
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
      
      // Load existing minutes if available
      if (data.minutes?.discussions) {
        try {
          const parsed = JSON.parse(data.minutes.discussions);
          if (parsed.savedMinutes && parsed.savedMinutes.length > 0) {
            const latestMinutes = parsed.savedMinutes[parsed.savedMinutes.length - 1];
            // Convert old format to new format if needed
            if (latestMinutes.minuteItems) {
              setMinutesData({
                meetingId: resolvedParams.id,
                attendees: latestMinutes.attendees || '',
                minuteItems: latestMinutes.minuteItems,
              });
            }
          }
        } catch (e) {
          console.log('No saved minutes found');
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      setLoading(false);
    }
  };

  const handleAddMinuteItem = () => {
    setMinutesData({
      ...minutesData,
      minuteItems: [
        ...minutesData.minuteItems,
        {
          id: Date.now().toString(),
          topic: '',
          discussion: '',
          decision: '',
          actionItem: '',
          responsible: '',
          dueDate: '',
        }
      ],
    });
  };

  const handleRemoveMinuteItem = (id: string) => {
    setMinutesData({
      ...minutesData,
      minuteItems: minutesData.minuteItems.filter(item => item.id !== id),
    });
  };

  const handleMinuteItemChange = (id: string, field: keyof MinuteItem, value: string) => {
    setMinutesData({
      ...minutesData,
      minuteItems: minutesData.minuteItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const handleSubmitMinutes = async () => {
    // Validate that at least one minute item has content
    const hasContent = minutesData.minuteItems.some(item => 
      item.topic.trim() || item.discussion.trim()
    );

    if (!hasContent) {
      alert('Please add at least one minute item with topic or discussion.');
      return;
    }

    setSaving(true);
    try {
      // Get existing saved minutes
      let existingSavedMinutes: any[] = [];
      if (meeting?.minutes?.discussions) {
        try {
          const parsed = JSON.parse(meeting.minutes.discussions);
          if (parsed.savedMinutes && Array.isArray(parsed.savedMinutes)) {
            existingSavedMinutes = parsed.savedMinutes;
          }
        } catch (e) {
          // Not JSON
        }
      }

      const newSavedMinutes = {
        id: Date.now().toString(),
        meetingId: resolvedParams.id,
        attendees: minutesData.attendees,
        minuteItems: minutesData.minuteItems,
        submitted: true,
        submittedAt: new Date().toISOString(),
      };

      const updatedSavedMinutes = [...existingSavedMinutes, newSavedMinutes];

      const response = await fetch(`/api/meetings/${resolvedParams.id}/minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discussions: JSON.stringify({ savedMinutes: updatedSavedMinutes }),
          decisions: '',
          actionItems: '',
          attendees: [],
        }),
      });

      if (response.ok) {
        alert('Minutes submitted successfully!');
        router.push('/minutes');
      }
    } catch (error) {
      console.error('Error saving minutes:', error);
      alert('Failed to submit minutes.');
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
          <h2 className="text-xl font-bold text-gray-900">New Minutes</h2>
          <button
            onClick={() => router.push('/minutes')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitMinutes(); }} className="p-6 space-y-5">
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

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendees (comma separated)
            </label>
            <input
              type="text"
              value={minutesData.attendees}
              onChange={(e) => setMinutesData({ ...minutesData, attendees: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John, Jane"
            />
          </div>

          {/* Minute Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Minute Items
              </label>
              <button
                type="button"
                onClick={handleAddMinuteItem}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            <div className="space-y-4">
              {minutesData.minuteItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                    {minutesData.minuteItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMinuteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Topic</label>
                    <input
                      type="text"
                      value={item.topic}
                      onChange={(e) => handleMinuteItemChange(item.id, 'topic', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Enter topic"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Discussion</label>
                    <textarea
                      value={item.discussion}
                      onChange={(e) => handleMinuteItemChange(item.id, 'discussion', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                      placeholder="Discussion details"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Decision</label>
                    <input
                      type="text"
                      value={item.decision}
                      onChange={(e) => handleMinuteItemChange(item.id, 'decision', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Decision made"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Action Item</label>
                    <input
                      type="text"
                      value={item.actionItem}
                      onChange={(e) => handleMinuteItemChange(item.id, 'actionItem', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Action to be taken"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Responsible</label>
                      <input
                        type="text"
                        value={item.responsible}
                        onChange={(e) => handleMinuteItemChange(item.id, 'responsible', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Person responsible"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={item.dueDate}
                        onChange={(e) => handleMinuteItemChange(item.id, 'dueDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-3 bg-blue-400 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? 'Creating Minutes...' : 'Create Minutes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
