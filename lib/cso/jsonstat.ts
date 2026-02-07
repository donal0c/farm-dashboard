export type JsonStatDataset = {
  id: string[];
  size: number[];
  dimension: Record<
    string,
    {
      category: {
        index: string[] | Record<string, number>;
        label?: Record<string, string>;
      };
    }
  >;
  value: Array<number | null>;
};

export type JsonStatRow = {
  value: number;
} & Record<string, string | number>;

function categoryCodes(index: string[] | Record<string, number>) {
  if (Array.isArray(index)) {
    return index;
  }

  return Object.entries(index)
    .sort((a, b) => a[1] - b[1])
    .map(([code]) => code);
}

export function decodeJsonStat(dataset: JsonStatDataset): JsonStatRow[] {
  const dimensionIds = dataset.id;
  const sizes = dataset.size;

  const strides = sizes.map((_, i) =>
    sizes.slice(i + 1).reduce((acc, size) => acc * size, 1),
  );

  const decoded: JsonStatRow[] = [];

  for (
    let linearIndex = 0;
    linearIndex < dataset.value.length;
    linearIndex += 1
  ) {
    const value = dataset.value[linearIndex];
    if (value === null || value === undefined) {
      continue;
    }

    const row: JsonStatRow = { value };

    for (
      let dimensionIndex = 0;
      dimensionIndex < dimensionIds.length;
      dimensionIndex += 1
    ) {
      const dimensionId = dimensionIds[dimensionIndex];
      const dimension = dataset.dimension[dimensionId];
      const codes = categoryCodes(dimension.category.index);
      const labels = dimension.category.label ?? {};
      const offset =
        Math.floor(linearIndex / strides[dimensionIndex]) %
        sizes[dimensionIndex];
      const code = codes[offset];

      row[dimensionId] = code;
      row[`${dimensionId}_label`] = labels[code] ?? code;
    }

    decoded.push(row);
  }

  return decoded;
}

export function parseYear(periodCode: string) {
  if (/^\d{4}$/.test(periodCode)) {
    return Number.parseInt(periodCode, 10);
  }
  if (/^\d{6}$/.test(periodCode)) {
    return Number.parseInt(periodCode.slice(0, 4), 10);
  }
  if (/^\d{5}$/.test(periodCode)) {
    return Number.parseInt(periodCode.slice(0, 4), 10);
  }

  return Number.NaN;
}
