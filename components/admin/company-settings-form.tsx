'use client';

import { useState, useEffect, useCallback } from 'react';

interface BusinessHours {
  [key: string]: {
    enabled: boolean;
    open: string;
    close: string;
  };
}

interface NotificationPreferences {
  email_certification_expiries: boolean;
  email_incident_reports: boolean;
  push_daily_inspections: boolean;
  sms_critical_alerts: boolean;
}

interface Location {
  id?: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  location_type: string;
  is_primary: boolean;
}

interface CompanySettings {
  logo_url?: string;
  business_hours?: BusinessHours;
  notification_preferences?: NotificationPreferences;
  fiscal_year_start_month?: number;
  target_certification_date?: string;
  audit_timeline_months?: number;
}

export default function CompanySettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Business hours state
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { enabled: true, open: '06:30', close: '16:30' },
    tuesday: { enabled: true, open: '06:30', close: '16:30' },
    wednesday: { enabled: true, open: '06:30', close: '16:30' },
    thursday: { enabled: true, open: '06:30', close: '16:30' },
    friday: { enabled: true, open: '06:30', close: '16:30' },
    saturday: { enabled: false, open: '09:00', close: '17:00' },
    sunday: { enabled: false, open: '09:00', close: '17:00' },
  });

  // Notification preferences state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email_certification_expiries: false,
    email_incident_reports: false,
    push_daily_inspections: false,
    sms_critical_alerts: false,
  });

  // Fiscal year
  const [fiscalYearStart, setFiscalYearStart] = useState(4); // April

  // Audit timeline
  const [targetDate, setTargetDate] = useState('');
  const [timelineMonths, setTimelineMonths] = useState(9);

  // Load settings
  useEffect(() => {
    loadSettings();
    loadLocations();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/company/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.logo_url) {
            setLogoPreview(data.settings.logo_url);
          }
          if (data.settings.business_hours) {
            setBusinessHours(data.settings.business_hours);
          }
          if (data.settings.notification_preferences) {
            setNotifications(data.settings.notification_preferences);
          }
          if (data.settings.fiscal_year_start_month) {
            setFiscalYearStart(data.settings.fiscal_year_start_month);
          }
          if (data.settings.target_certification_date) {
            setTargetDate(data.settings.target_certification_date);
          }
          if (data.settings.audit_timeline_months) {
            setTimelineMonths(data.settings.audit_timeline_months);
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/admin/company/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleLogoUpload = async () => {
    try {
      const response = await fetch('/api/admin/company/settings/logo', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setLogoPreview(data.logo_url);
        setSettings({ ...settings, logo_url: data.logo_url });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to generate logo placeholder');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calculate target date from timeline months
      const calculatedTargetDate = targetDate || (() => {
        const date = new Date();
        date.setMonth(date.getMonth() + timelineMonths);
        return date.toISOString().split('T')[0];
      })();

      const response = await fetch('/api/admin/company/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: settings.logo_url || logoPreview,
          business_hours: businessHours,
          notification_preferences: notifications,
          fiscal_year_start_month: fiscalYearStart,
          target_certification_date: calculatedTargetDate,
          audit_timeline_months: timelineMonths,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async () => {
    const newLocation: Location = {
      name: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      location_type: 'office',
      is_primary: false,
    };
    setLocations([...locations, newLocation]);
  };

  const handleLocationChange = (index: number, field: keyof Location, value: any) => {
    const updated = [...locations];
    // Safe: index is a number from component iteration, field is keyof Location
    // eslint-disable-next-line security/detect-object-injection
    updated[index] = { ...updated[index], [field]: value };
    
    // If setting as primary, unset others
    if (field === 'is_primary' && value) {
      updated.forEach((loc, i) => {
        if (i !== index) loc.is_primary = false;
      });
    }
    
    setLocations(updated);
  };

  const handleSaveLocation = async (index: number) => {
    // Safe: index is a number from button click handler
    // eslint-disable-next-line security/detect-object-injection
    const location = locations[index];
    if (!location.name) {
      alert('Location name is required');
      return;
    }

    try {
      const url = location.id 
        ? '/api/admin/company/locations'
        : '/api/admin/company/locations';
      const method = location.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location.id ? { id: location.id, ...location } : location),
      });

      if (response.ok) {
        const data = await response.json();
        const updated = [...locations];
        // Safe: index is a number from function parameter
        // eslint-disable-next-line security/detect-object-injection
        updated[index] = data.location;
        setLocations(updated);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert('Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Failed to save location');
    }
  };

  const handleDeleteLocation = async (index: number) => {
    // Safe: index is a number from button click handler
    // eslint-disable-next-line security/detect-object-injection
    const location = locations[index];
    if (!location.id) {
      // Remove unsaved location
      setLocations(locations.filter((_, i) => i !== index));
      return;
    }

    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/company/locations?id=${location.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLocations(locations.filter((_, i) => i !== index));
      } else {
        alert('Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[var(--muted)]">Loading settings...</div>
      </div>
    );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg">
          Settings saved successfully!
        </div>
      )}

      {/* Company Logo */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Company Logo
        </h3>

        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="Company Logo" 
                className="w-32 h-32 rounded-lg border border-slate-700 object-contain bg-slate-800"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-[var(--muted)]">
                No logo
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--muted)] mb-4">
              Upload your company logo or generate a placeholder logo with blue/green mountains and "MRC" text.
            </p>
            <button
              onClick={handleLogoUpload}
              className="btn btn-secondary"
            >
              Generate Placeholder Logo
            </button>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Business Hours
        </h3>

        <div className="space-y-3">
          {dayNames.map((day) => {
            const dayHours = businessHours[day.key];
            return (
              <div key={day.key} className="flex items-center gap-4">
                <div className="w-24">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayHours.enabled}
                      onChange={(e) => {
                        setBusinessHours({
                          ...businessHours,
                          [day.key]: { ...dayHours, enabled: e.target.checked },
                        });
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600"
                    />
                    <span className="text-sm font-medium">{day.label}</span>
                  </label>
                </div>
                {dayHours.enabled && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => {
                        setBusinessHours({
                          ...businessHours,
                          [day.key]: { ...dayHours, open: e.target.value },
                        });
                      }}
                      className="input text-sm"
                    />
                    <span className="text-[var(--muted)]">to</span>
                    <input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => {
                        setBusinessHours({
                          ...businessHours,
                          [day.key]: { ...dayHours, close: e.target.value },
                        });
                      }}
                      className="input text-sm"
                    />
                  </div>
                )}
                {!dayHours.enabled && (
                  <span className="text-sm text-[var(--muted)]">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Notification Preferences
        </h3>

        <div className="space-y-4">
          {[
            {
              key: 'email_certification_expiries' as keyof NotificationPreferences,
              label: 'Email for Certification Expiries',
              desc: 'Receive email notifications when certifications are about to expire',
            },
            {
              key: 'email_incident_reports' as keyof NotificationPreferences,
              label: 'Email for Incident Reports',
              desc: 'Get notified via email when incident reports are submitted',
            },
            {
              key: 'push_daily_inspections' as keyof NotificationPreferences,
              label: 'Push Notifications for Daily Inspections',
              desc: 'Receive push notifications for daily inspection reminders',
            },
            {
              key: 'sms_critical_alerts' as keyof NotificationPreferences,
              label: 'SMS for Critical Safety Alerts',
              desc: 'Receive SMS notifications for critical safety alerts',
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-[var(--muted)]">{item.desc}</p>
              </div>
              <button
                onClick={() => {
                  setNotifications({
                    ...notifications,
                    [item.key]: !notifications[item.key],
                  });
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications[item.key] ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notifications[item.key] ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Work Locations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Primary Work Locations
          </h3>
          <button onClick={handleAddLocation} className="btn btn-secondary text-sm">
            + Add Location
          </button>
        </div>

        <div className="space-y-4">
          {locations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No locations added yet. Click "Add Location" to get started.</p>
          ) : (
            locations.map((location, index) => (
              <div key={index} className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Location Name *</label>
                    <input
                      type="text"
                      value={location.name}
                      onChange={(e) => handleLocationChange(index, 'name', e.target.value)}
                      className="input"
                      placeholder="e.g., Ottawa Head Office"
                    />
                  </div>
                  <div>
                    <label className="label">Location Type</label>
                    <select
                      value={location.location_type}
                      onChange={(e) => handleLocationChange(index, 'location_type', e.target.value)}
                      className="input"
                    >
                      <option value="office">Office</option>
                      <option value="shop">Shop</option>
                      <option value="site">Site</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Address</label>
                  <input
                    type="text"
                    value={location.address || ''}
                    onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
                    className="input"
                    placeholder="Street address"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">City</label>
                    <input
                      type="text"
                      value={location.city || ''}
                      onChange={(e) => handleLocationChange(index, 'city', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Province</label>
                    <input
                      type="text"
                      value={location.province || ''}
                      onChange={(e) => handleLocationChange(index, 'province', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Postal Code</label>
                    <input
                      type="text"
                      value={location.postal_code || ''}
                      onChange={(e) => handleLocationChange(index, 'postal_code', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={location.is_primary}
                      onChange={(e) => handleLocationChange(index, 'is_primary', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600"
                    />
                    <span className="text-sm">Set as primary location</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveLocation(index)}
                      className="btn btn-secondary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(index)}
                      className="btn btn-danger text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fiscal Year */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Fiscal Year
        </h3>

        <div>
          <label className="label">Fiscal Year Start Month</label>
          <select
            value={fiscalYearStart}
            onChange={(e) => setFiscalYearStart(Number(e.target.value))}
            className="input"
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index + 1}>
                {month} (Month {index + 1})
              </option>
            ))}
          </select>
          <p className="text-sm text-[var(--muted)] mt-2">
            Your fiscal year runs from {monthNames[fiscalYearStart - 1]} to {monthNames[(fiscalYearStart - 2 + 12) % 12]}
          </p>
        </div>
      </div>

      {/* COR Audit Timeline */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          COR Audit Timeline
        </h3>

        <div className="space-y-4">
          <div>
            <label className="label">Target Certification Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="input"
            />
            <p className="text-sm text-[var(--muted)] mt-2">
              Or set timeline in months below
            </p>
          </div>
          <div>
            <label className="label">Timeline (Months)</label>
            <input
              type="number"
              value={timelineMonths}
              onChange={(e) => {
                const months = Number(e.target.value);
                setTimelineMonths(months);
                if (months > 0) {
                  const date = new Date();
                  date.setMonth(date.getMonth() + months);
                  setTargetDate(date.toISOString().split('T')[0]);
                }
              }}
              className="input"
              min="1"
              max="24"
            />
            <p className="text-sm text-[var(--muted)] mt-2">
              Target certification in {timelineMonths} months ({(() => {
                const date = new Date();
                date.setMonth(date.getMonth() + timelineMonths);
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              })()})
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
