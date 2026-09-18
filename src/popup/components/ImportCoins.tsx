import React from 'react';

const exampleJSON = `{
  "coins": ["BTC", "ETH", "..."],
  "price_alerts": [
    {
      "symbol": "BTC",
      "targetPrice": 93000,
      "direction": "above",
      "enabled": true,
      "createdAt": 1768294408260,
      "updatedAt": 1768294408260
    },
    ...
  ]
}`;

const ImportCoins: React.FC = () => {
  return (
    <div className="px-4 pb-2">
      <p className="text-muted text-xs mb-3">Please select a valid JSON file.</p>
      <div className="bg-input rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto">
        <pre className="whitespace-pre-wrap">{exampleJSON}</pre>
      </div>
    </div>
  );
};

export default ImportCoins;
