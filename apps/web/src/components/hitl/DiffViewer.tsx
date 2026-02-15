import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

interface DiffViewerProps {
  originalText: string;
  analysisText: string;
  title?: string;
}

const diffStyles = {
  variables: {
    dark: {
      diffViewerBackground: '#0A0A0A',
      diffViewerColor: '#FAFAFA',
      addedBackground: '#22C55E15',
      addedColor: '#22C55E',
      removedBackground: '#EF444415',
      removedColor: '#EF4444',
      wordAddedBackground: '#22C55E30',
      wordRemovedBackground: '#EF444430',
      addedGutterBackground: '#22C55E10',
      removedGutterBackground: '#EF444410',
      gutterBackground: '#111111',
      gutterBackgroundDark: '#0A0A0A',
      codeFoldBackground: '#1A1A1A',
      codeFoldGutterBackground: '#111111',
      codeFoldContentColor: '#A0A0A0',
      emptyLineBackground: '#111111',
    },
  },
};

export function DiffViewer({ originalText, analysisText, title }: DiffViewerProps) {
  return (
    <div className="space-y-2" data-testid="diff-viewer">
      {title && <h3 className="text-lg font-semibold text-(--color-text)">{title}</h3>}
      <div className="border border-(--color-border) rounded-xl overflow-hidden text-sm">
        <ReactDiffViewer
          oldValue={originalText}
          newValue={analysisText}
          splitView
          compareMethod={DiffMethod.WORDS}
          leftTitle="Texto Original"
          rightTitle="Análise FIRAC"
          styles={diffStyles}
          useDarkTheme
        />
      </div>
    </div>
  );
}
