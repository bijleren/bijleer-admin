import { Brain } from 'lucide-react';

export default function ExecutiveFunctions() {
  return (
    <div className="w-full h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Brain className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Executieve Functies</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Executieve Functies App</h2>
        <p className="text-gray-500">Deze pagina is in ontwikkeling.</p>
      </div>
    </div>
  );
}
