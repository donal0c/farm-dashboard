export type GenUiToolCall =
  | {
      tool: "showBarChart";
      payload: {
        title: string;
        labels: string[];
        values: number[];
      };
    }
  | {
      tool: "showDataTable";
      payload: {
        title: string;
        columns: string[];
        rows: Array<Array<string | number>>;
      };
    }
  | {
      tool: "showMap";
      payload: {
        title: string;
        latitude: number;
        longitude: number;
      };
    }
  | {
      tool: "showParcelInfo";
      payload: {
        title: string;
        parcelId: string;
        cropType: string;
        areaHa: number;
        tenure: string;
      };
    };

export type GenUiChatResponse = {
  reply: string;
  toolCalls: GenUiToolCall[];
};
