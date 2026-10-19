import React from "react";
export default function NativePhoneChrome() {
  return (
    <>
      <div className="native-status-bar" aria-hidden="true">
        <span className="native-clock">9:41</span>
        <div className="native-island">
          <span className="native-island-camera" />
        </div>
        <div className="native-status-indicators">
          <svg className="native-signal" viewBox="0 0 20 14">
            <rect x="1" y="10" width="3" height="4" rx=".8" />
            <rect x="6" y="7" width="3" height="7" rx=".8" />
            <rect x="11" y="4" width="3" height="10" rx=".8" />
            <rect x="16" y="1" width="3" height="13" rx=".8" />
          </svg>
          <svg className="native-wifi" viewBox="0 0 20 15">
            <path d="M2 5a12 12 0 0 1 16 0M5 8a7.5 7.5 0 0 1 10 0M8 11a3 3 0 0 1 4 0" />
            <circle cx="10" cy="13" r="1" />
          </svg>
          <svg className="native-battery" viewBox="0 0 28 14">
            <rect
              className="native-battery-shell"
              x="1"
              y="1.5"
              width="23"
              height="11"
              rx="3"
            />
            <rect
              className="native-battery-fill"
              x="3"
              y="3.5"
              width="19"
              height="7"
              rx="1.3"
            />
            <path className="native-battery-cap" d="M26 5v4" />
          </svg>
        </div>
      </div>
      <div className="native-home-area" aria-hidden="true">
        <span className="native-home-indicator" />
      </div>
    </>
  );
}
