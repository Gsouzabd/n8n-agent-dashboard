import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  DollarSign,
  TrendingUp,
  Activity,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react';

interface CostSummary {
  total_cost_usd: number;
  total_tokens: number;
  embedding_cost_usd: number;
  completion_cost_usd: number;
  chat_cost_usd: number;
  embedding_tokens: number;
  completion_tokens: number;
  total_requests: number;
  avg_cost_per_request: number;
  last_usage: string;
}

interface DailyCost {
  date: string;
  operation_type: string;
  daily_cost_usd: number;
  daily_tokens: number;
  daily_requests: number;
}

interface UsageLog {
  id: string;
  operation_type: string;
  model: string;
  total_tokens: number;
  cost_usd: number;
  url?: string;
  chunks_processed?: number;
  created_at: string;
}

export default function OpenAICosts() {
  const { currentOrganization } = useOrganization();
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [recentLogs, setRecentLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (currentOrganization) {
      loadData();
    }
  }, [currentOrganization, selectedPeriod]);

  const loadData = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      // Carregar resumo do mês atual
      const { data: summaryData } = await supabase
        .from('openai_cost_summary')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();

      setSummary(summaryData || null);

      // Carregar custos diários
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      const { data: dailyData } = await supabase
        .from('openai_daily_costs')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      setDailyCosts(dailyData || []);

      // Carregar logs recentes
      const { data: logsData } = await supabase
        .from('openai_usage_logs')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setRecentLogs(logsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados de custo:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!recentLogs.length) return;

    const headers = ['Data', 'Tipo', 'Modelo', 'Tokens', 'Custo (USD)', 'URL', 'Chunks'];
    const rows = recentLogs.map(log => [
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.operation_type,
      log.model,
      log.total_tokens,
      log.cost_usd.toFixed(6),
      log.url || '-',
      log.chunks_processed || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openai-costs-${currentOrganization?.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhuma organização selecionada</h3>
          <p className="mt-1 text-sm text-gray-500">Selecione uma organização para ver os custos</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalCost = summary?.total_cost_usd || 0;
  const avgCostPerDay = dailyCosts.length > 0
    ? dailyCosts.reduce((sum, d) => sum + d.daily_cost_usd, 0) / dailyCosts.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custos OpenAI</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitoramento de uso e custos da API OpenAI
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Custo Total (Mês Atual)
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ${totalCost.toFixed(4)} USD
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Média Diária ({selectedPeriod})
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ${avgCostPerDay.toFixed(4)} USD
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Tokens
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {(summary?.total_tokens || 0).toLocaleString('pt-BR')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Requisições
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary?.total_requests || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtro de Período */}
      <div className="flex gap-2">
        <Button
          variant={selectedPeriod === '7d' ? 'primary' : 'outline'}
          onClick={() => setSelectedPeriod('7d')}
          size="sm"
        >
          7 dias
        </Button>
        <Button
          variant={selectedPeriod === '30d' ? 'primary' : 'outline'}
          onClick={() => setSelectedPeriod('30d')}
          size="sm"
        >
          30 dias
        </Button>
        <Button
          variant={selectedPeriod === '90d' ? 'primary' : 'outline'}
          onClick={() => setSelectedPeriod('90d')}
          size="sm"
        >
          90 dias
        </Button>
      </div>

      {/* Breakdown por Tipo */}
      {summary && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Distribuição de Custos por Tipo
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Embeddings</span>
                  <span className="text-sm text-gray-900">
                    ${summary.embedding_cost_usd?.toFixed(4) || '0.0000'} USD
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${totalCost > 0 ? (summary.embedding_cost_usd / totalCost) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(summary.embedding_tokens || 0).toLocaleString('pt-BR')} tokens
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Completions</span>
                  <span className="text-sm text-gray-900">
                    ${summary.completion_cost_usd?.toFixed(4) || '0.0000'} USD
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${totalCost > 0 ? (summary.completion_cost_usd / totalCost) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(summary.completion_tokens || 0).toLocaleString('pt-BR')} tokens
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Chat</span>
                  <span className="text-sm text-gray-900">
                    ${summary.chat_cost_usd?.toFixed(4) || '0.0000'} USD
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${totalCost > 0 ? (summary.chat_cost_usd / totalCost) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Logs Recentes */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Requisições Recentes
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum uso registrado ainda
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          log.operation_type === 'embedding' ? 'bg-blue-100 text-blue-800' :
                          log.operation_type === 'completion' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {log.operation_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.model}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.total_tokens.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${log.cost_usd.toFixed(6)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {log.operation_type === 'embedding' && log.chunks_processed && (
                          <span className="text-xs">
                            {log.chunks_processed} chunks
                          </span>
                        )}
                        {log.url && (
                          <a
                            href={log.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs truncate block max-w-xs"
                            title={log.url}
                          >
                            {log.url}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Projeção de Custos */}
      {avgCostPerDay > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Projeção de Custos
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Estimativa Semanal</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  ${(avgCostPerDay * 7).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Estimativa Mensal</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  ${(avgCostPerDay * 30).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Estimativa Anual</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  ${(avgCostPerDay * 365).toFixed(2)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              * Baseado na média de uso dos últimos {selectedPeriod}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

