export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">Saral-Sandhi</h1>
          <p className="text-gray-500 mt-1">Contract Analysis Made Simple</p>
        </div>
        {children}
      </div>
    </div>
  );
}
