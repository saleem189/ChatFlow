// ================================
// Call Loading State
// ================================

export default function CallLoading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-muted">
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-muted-foreground">Joining call...</p>
      </div>
    </div>
  );
}

