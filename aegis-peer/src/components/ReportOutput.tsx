import React from 'react';

export interface AegisEngineResult {
  peerWeights: number[];
  logic: number;
  emotion: number;
  moodType: string;
  keyAxiom: number;
  peerSummary: string;
  suggestText: string;
  isFractured: boolean;
  vector: string;
}

export type ReportType = "single" | "cumulative" | "aggregate";

interface ReportOutputProps {
  history: AegisEngineResult[];
  reportType: ReportType;
}

const ReportOutput: React.FC<ReportOutputProps> = ({ history, reportType }) => {
  if (history.length === 0) {
    return <p className="mirror-muted">No report data available.</p>;
  }

  const getReportData = () => {
    switch (reportType) {
      case "single":
        return history.slice(-1);
      case "cumulative":
        return history.slice(-5);
      case "aggregate":
        return history;
      default:
        return history.slice(-1);
    }
  };

  const reportData = getReportData();
  const latest = reportData[reportData.length - 1];

  return (
    <div className="mirror-report-output">
      <div className="mirror-insight-grid">
        <div>
          <p className="mirror-insight-label">Mood Type</p>
          <p className="mirror-insight-value">{latest.moodType}</p>
        </div>
        <div>
          <p className="mirror-insight-label">Logic Score</p>
          <p className="mirror-insight-value">{Math.round(latest.logic * 100)}%</p>
        </div>
        <div>
          <p className="mirror-insight-label">Emotion Score</p>
          <p className="mirror-insight-value">{Math.round(latest.emotion * 100)}%</p>
        </div>
        <div>
          <p className="mirror-insight-label">Status</p>
          <p className="mirror-insight-value">{latest.isFractured ? "Fractured" : "Stable"}</p>
        </div>
      </div>
      
      <div>
        <p className="mirror-insight-label">Summary</p>
        <p className="mirror-insight-value">{latest.peerSummary}</p>
      </div>
      
      <div>
        <p className="mirror-insight-label">Suggestion</p>
        <p className="mirror-insight-value">{latest.suggestText}</p>
      </div>
      
      {reportType !== "single" && (
        <div>
          <p className="mirror-insight-label">Report Entries</p>
          <p className="mirror-insight-value">{reportData.length} entries</p>
        </div>
      )}
    </div>
  );
};

export default ReportOutput;