import { FileQuestion, ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Page Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">
            The requested page or resource could not be found.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <ButtonLink href="/packages">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Packages
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
