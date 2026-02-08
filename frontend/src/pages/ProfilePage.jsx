import { 
  User, Mail, Phone, MapPin, Calendar
} from "lucide-react";
import { useState } from "react";

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState("about");

  const tabs = [
    { id: "about", label: "About Me" },
    
    { id: "family", label: "Family" },
  ];

  // Inline Style Objects
  const containerStyle = { padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'sans-serif' };
  const cardStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '2rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
  const tabContainerStyle = { backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
  
  return (
    <div style={containerStyle}>
      {/* Profile Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '128px', height: '128px', 
            background: 'linear-gradient(135deg, #3b82f6 0%, #4338ca 100%)',
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={64} color="white" />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Jacob Angelo Miguel Calderon
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Bachelor of Science in Information Technology
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <HeaderDetail icon={Mail} text="jacob@example.com" />
              <HeaderDetail icon={Phone} text="+63 912 345 6789" />
              <HeaderDetail icon={MapPin} text="Pasig City, PH" />
              <HeaderDetail icon={Calendar} text="ID: 2023-00001" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div style={tabContainerStyle}>
        <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', backgroundColor: '#ffffff' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                color: activeTab === tab.id ? '#dc2626' : '#6b7280',
                borderBottom: activeTab === tab.id ? '3px solid #dc2626' : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === "about" && <AboutMeTab />}
          {activeTab === "family" && <FamilyTab />}
        </div>
      </div>
    </div>
  );
}

// --------------------
// Tab Components
// --------------------

function AboutMeTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Basic Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Full Name" value="Jacob Angelo Miguel Calderon" />
          <InfoRow label="Date of Birth" value="January 15, 2005" />
          <InfoRow label="Gender" value="Male" />
          <InfoRow label="Civil Status" value="Single" />
        </div>
      </section>
      <section style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', color: '#111827' }}>Contact Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <InfoRow label="Email" value="jacob.calderon@student.edu.ph" />
          <InfoRow label="Phone" value="+63 912 345 6789" />
          <InfoRow label="City" value="Pasig City" />
          <InfoRow label="Country" value="Philippines" />
        </div>
      </section>
    </div>
  );
}




function FamilyTab() {
  return (
    <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#111827' }}>JACOB, DANILO GREGORIO</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
        <div><span style={{ color: '#6b7280' }}>Relationship:</span> Father</div>
        <div><span style={{ color: '#6b7280' }}>Contact:</span> +63 917 123 4567</div>
      </div>
    </div>
  );
}

// --------------------
// UI Helpers
// --------------------

function HeaderDetail({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
      <Icon size={18} color="#3b82f6" />
      <span>{text}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
      <span style={{ color: '#6b7280', fontSize: '14px' }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}




export { default } from './student/ProfilePage';