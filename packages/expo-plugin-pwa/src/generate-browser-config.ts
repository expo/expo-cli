export function generateBrowserConfig({
  src,
  tileColor,
}: {
  src: string;
  tileColor: string;
}): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="${src}"/>
            <TileColor>${tileColor}</TileColor>
        </tile>
    </msapplication>
</browserconfig>
`;
}
