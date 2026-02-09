import React from "react";
import schoolLogo from "../assets/taguigpic.png"; // school logo
import heroBannerImage from "../assets/NexoraHome.png"; // hero banner image
import gatBgImage from "../assets/Gatbg.png"; // imported correctly

export default function SplashScreen({ onSelectRole }) {
  const handleLogin = () => {
    if (onSelectRole) {
      onSelectRole(null, "login");
    } else {
      console.log("Login clicked");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={schoolLogo}
              alt="School Logo"
              style={{ width: 80, height: 80, borderRadius: 12 }}
            />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
                GAT ANDRES BONIFACIO
              </h1>
              <p style={{ fontSize: 14, color: "#4b5563", margin: 0 }}>HIGH SCHOOL</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
<div style={{ padding: "48px 32px" }}> {/* removed the red gradient here */}
  <div style={{ maxWidth: 1280, margin: "0 auto" }}>
    <div
      style={{
        backgroundColor: "#fff", // keep the white card
        borderRadius: 12,
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        overflow: "hidden",
        position: "relative",
        height: 256,
      }}
    >
      <img
        src={heroBannerImage}
        alt="Hero Banner"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(239,68,68,0.8), transparent)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 48,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#fff",
              margin: 0,
              marginBottom: 8,
            }}
          >
            Welcome to Nexora 
          </h2>
          <p style={{ fontSize: 16, color: "#fff", margin: 0 }}>
            Your one-stop portal for all GABHS Applications
          </p>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* White Section with Full Cover Background */}
<div
  style={{
    position: "relative",
    width: "100%",
    height: 400,       // you can adjust height as needed
    overflow: "hidden",
    margin: 0,         // remove any outside margin
    padding: 0,        // remove padding so bg fully extends
  }}
>
  {/* Background Image covers entire container */}
  <img
    src={gatBgImage}
    alt="Background"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />

  {/* Nexora Card Overlapping */}
  <div
    style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#fff",
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      border: "1px solid #e5e7eb",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      width: "90%",
      maxWidth: 360,
      alignItems: "center",
      gap: 16,
    }}
  >
    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Nexora</h3>
    <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 4, textAlign: "center" }}>
      Your Access to Services
    </p>
    <p style={{ fontSize: 14, color: "#374151", marginBottom: 16, textAlign: "center" }}>
      Login or re-enroll enables for academic services accessible anytime, anywhere.
    </p>
    <button
      onClick={handleLogin}
      style={{
        padding: "8px 16px",
        backgroundColor: "#dc2626",
        color: "#fff",
        borderRadius: 8,
        border: "none",
        fontWeight: 600,
        cursor: "pointer",
        width: "100%",
      }}
    >
      LOGIN
    </button>
    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12, textAlign: "center" }}>
      For students, faculty and staff.
    </p>
  </div>
</div>
      {/* Footer */}
      <footer
        style={{
          background: "linear-gradient(to right, #dc2626, #b91c1c)",
          color: "#fff",
          padding: "48px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 48,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <img src={schoolLogo} alt="Footer Icon" style={{ width: 48, height: 48, borderRadius: 8 }} />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>GAT ANDRES BONIFACIO</h3>
                <p style={{ fontSize: 12, margin: 0 }}>HIGH SCHOOL</p>
              </div>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>ABOUT NEXORA </h4>
            <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>
              Nexora is a suite of online services and tools designed to provide students, faculty, and staff convenient access to school services and information.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>CONTACT US</h4>
            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>
              <p>📍 Bonifacio, Taguig, Philippines</p>
              <p>📞 +8808-75-43</p>
              <p>✉️ sdotapat.gabhs@deped.gov.ph</p>
              <p>🕐 MONDAY - FRIDAY • 8:AM - 5:PM • CLOSED</p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            textAlign: "center",
            fontSize: 12,
            opacity: 0.75,
          }}
        >
          All Rights Reserved. Gat Andres Bonifacio High School
        </div>
      </footer>
    </div>
  );
}
