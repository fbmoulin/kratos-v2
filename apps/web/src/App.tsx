const APP_NAME = 'KRATOS v2';
const APP_VERSION = '2.0.0';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">{APP_NAME}</h1>
        <p className="mt-2 text-gray-600">v{APP_VERSION}</p>
        <p className="mt-4 text-sm text-gray-500">
          Plataforma de Automação Jurídica com IA
        </p>
      </div>
    </div>
  );
}
