'use client';

/**
 * COR Mapping Panel Component
 * 
 * Allows users to map forms to COR elements with AI suggestions.
 */

import { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  HelpCircle,
  X,
} from 'lucide-react';
import type { 
  CORElementSuggestion, 
  AuditQuestionSuggestion,
  ConversionSession 
} from '@/lib/pdf-converter/types';
import { getAllCORElements, NON_COR_CATEGORIES } from '@/lib/pdf-converter/cor-mapper';

// =============================================================================
// TYPES
// =============================================================================

interface CORMappingPanelProps {
  session: ConversionSession;
  suggestions: CORElementSuggestion[];
  onElementSelect: (element: number | null) => void;
  onQuestionsLink: (questionIds: string[]) => void;
  onNotCORRelated: (category: string | null) => void;
}

// =============================================================================
// COR ELEMENT COLORS
// =============================================================================

// Safe: Element numbers are constrained to 1-14 as known COR element numbers
 
const ELEMENT_COLORS: Record<number, string> = {
  1: 'from-blue-500 to-blue-600',
  2: 'from-orange-500 to-orange-600',
  3: 'from-emerald-500 to-emerald-600',
  4: 'from-purple-500 to-purple-600',
  5: 'from-pink-500 to-pink-600',
  6: 'from-cyan-500 to-cyan-600',
  7: 'from-amber-500 to-amber-600',
  8: 'from-teal-500 to-teal-600',
  9: 'from-indigo-500 to-indigo-600',
  10: 'from-red-500 to-red-600',
  11: 'from-rose-500 to-rose-600',
  12: 'from-violet-500 to-violet-600',
  13: 'from-lime-500 to-lime-600',
  14: 'from-sky-500 to-sky-600',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CORMappingPanel({
  session,
  suggestions,
  onElementSelect,
  onQuestionsLink,
  onNotCORRelated,
}: CORMappingPanelProps) {
  const [selectedElement, setSelectedElement] = useState<number | null>(session.cor_element);
  const [isCorRelated, setIsCorRelated] = useState(session.is_cor_related);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(session.linked_audit_questions || [])
  );
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(
    suggestions[0]?.element_number || null
  );
  const [showAllElements, setShowAllElements] = useState(false);
  const [customCategory, setCustomCategory] = useState(session.custom_category || '');

  const allElements = getAllCORElements();

  const handleElementSelect = (element: number) => {
    setSelectedElement(element);
    setIsCorRelated(true);
    onElementSelect(element);
  };

  const handleNotCORRelated = () => {
    setIsCorRelated(false);
    setSelectedElement(null);
    onNotCORRelated(customCategory || null);
  };

  const handleQuestionToggle = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
    onQuestionsLink(Array.from(newSelected));
  };

  // Get suggestion for selected element
  const selectedSuggestion = suggestions.find(s => s.element_number === selectedElement);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-200">COR Element Mapping</h3>
          <p className="text-sm text-slate-400">
            Link this form to COR audit elements for evidence tracking
          </p>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Suggestions</span>
          </div>
          
          <div className="space-y-2">
            {suggestions.slice(0, showAllElements ? undefined : 3).map((suggestion) => (
              <SuggestionCard
                key={suggestion.element_number}
                suggestion={suggestion}
                isSelected={selectedElement === suggestion.element_number}
                isExpanded={expandedSuggestion === suggestion.element_number}
                onSelect={() => handleElementSelect(suggestion.element_number)}
                onToggleExpand={() => setExpandedSuggestion(
                  expandedSuggestion === suggestion.element_number 
                    ? null 
                    : suggestion.element_number
                )}
                selectedQuestions={selectedQuestions}
                onQuestionToggle={handleQuestionToggle}
              />
            ))}
          </div>
          
          {suggestions.length > 3 && !showAllElements && (
            <button
              onClick={() => setShowAllElements(true)}
              className="w-full text-center py-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Show {suggestions.length - 3} more suggestions
            </button>
          )}
        </div>
      )}

      {/* Manual Selection */}
      <div className="space-y-3">
        <div className="text-sm text-slate-300 font-medium">
          Or select manually
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {allElements.map((element) => {
            const isSuggested = suggestions.some(s => s.element_number === element.number);
            return (
              <button
                key={element.number}
                onClick={() => handleElementSelect(element.number)}
                className={`
                  relative p-3 rounded-lg text-left transition-all
                  ${selectedElement === element.number
                    ? 'ring-2 ring-indigo-500 bg-indigo-500/20'
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-lg bg-gradient-to-br ${ELEMENT_COLORS[element.number]}
                  flex items-center justify-center text-white font-bold text-sm mb-2
                `}>
                  {element.number}
                </div>
                <div className="text-xs text-slate-200 font-medium line-clamp-2">
                  {element.name}
                </div>
                {isSuggested && (
                  <div className="absolute top-2 right-2">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                )}
                {selectedElement === element.number && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Not COR Related Option */}
      <div className="pt-4 border-t border-slate-700 space-y-3">
        <button
          onClick={handleNotCORRelated}
          className={`
            w-full flex items-center gap-3 p-4 rounded-xl transition-all
            ${!isCorRelated
              ? 'ring-2 ring-amber-500 bg-amber-500/10'
              : 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
            }
          `}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-left flex-1">
            <div className="font-medium text-slate-200">Not COR-Related</div>
            <div className="text-sm text-slate-400">
              This form is for custom tracking, not COR audits
            </div>
          </div>
          {!isCorRelated && (
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
          )}
        </button>

        {!isCorRelated && (
          <div className="pl-4">
            <label className="block text-sm text-slate-300 mb-2">
              Category (optional)
            </label>
            <select
              value={customCategory}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                onNotCORRelated(e.target.value || null);
              }}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Select category...</option>
              {NON_COR_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected Element Details */}
      {selectedElement && selectedSuggestion && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className={`
              w-10 h-10 rounded-lg bg-gradient-to-br ${
                // Safe: selectedElement is validated to be 1-14
                // eslint-disable-next-line security/detect-object-injection
                ELEMENT_COLORS[selectedElement]
              }
              flex items-center justify-center text-white font-bold
            `}>
              {selectedElement}
            </div>
            <div>
              <div className="font-medium text-slate-200">
                {allElements.find(e => e.number === selectedElement)?.name}
              </div>
              <div className="text-sm text-slate-400">
                {selectedSuggestion.reasoning}
              </div>
            </div>
          </div>

          {/* Linked Questions */}
          {selectedSuggestion.related_questions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm font-medium text-slate-300 mb-2">
                Linked Audit Questions
              </div>
              <div className="space-y-2">
                {selectedSuggestion.related_questions.map((q) => (
                  <button
                    key={q.question_id}
                    onClick={() => handleQuestionToggle(q.question_id)}
                    className={`
                      w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all
                      ${selectedQuestions.has(q.question_id)
                        ? 'bg-indigo-500/20 border border-indigo-500/50'
                        : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                      }
                    `}
                  >
                    {selectedQuestions.has(q.question_id) ? (
                      <BookmarkCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200">{q.question_text}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Question {q.question_id} • {q.relevance_score}% relevant
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUGGESTION CARD
// =============================================================================

interface SuggestionCardProps {
  suggestion: CORElementSuggestion;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  selectedQuestions: Set<string>;
  onQuestionToggle: (id: string) => void;
}

function SuggestionCard({
  suggestion,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  selectedQuestions,
  onQuestionToggle,
}: SuggestionCardProps) {
  return (
    <div className={`
      rounded-xl border transition-all overflow-hidden
      ${isSelected 
        ? 'border-indigo-500 bg-indigo-500/10' 
        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }
    `}>
      <div className="flex items-center gap-3 p-4">
        <div className={`
          w-12 h-12 rounded-xl bg-gradient-to-br ${ELEMENT_COLORS[suggestion.element_number]}
          flex items-center justify-center text-white font-bold text-lg flex-shrink-0
        `}>
          {suggestion.element_number}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">{suggestion.element_name}</span>
            <span className={`
              px-2 py-0.5 text-xs font-medium rounded-full
              ${suggestion.confidence >= 70 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : suggestion.confidence >= 40
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-600 text-slate-300'
              }
            `}>
              {suggestion.confidence}% match
            </span>
          </div>
          <div className="text-sm text-slate-400 truncate">{suggestion.reasoning}</div>
        </div>
        
        <div className="flex items-center gap-2">
          {suggestion.related_questions.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          <button
            onClick={onSelect}
            className={`
              p-2 rounded-lg transition-colors
              ${isSelected
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:bg-slate-700'
              }
            `}
          >
            {isSelected ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-current" />
            )}
          </button>
        </div>
      </div>
      
      {/* Expanded Questions */}
      {isExpanded && suggestion.related_questions.length > 0 && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 mt-1">
          <div className="text-xs font-medium text-slate-400 mb-2">
            Related Audit Questions
          </div>
          <div className="space-y-2">
            {suggestion.related_questions.map((q) => (
              <button
                key={q.question_id}
                onClick={() => onQuestionToggle(q.question_id)}
                className={`
                  w-full flex items-start gap-2 p-2 rounded-lg text-left text-sm transition-all
                  ${selectedQuestions.has(q.question_id)
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-slate-400 hover:bg-slate-700/50'
                  }
                `}
              >
                {selectedQuestions.has(q.question_id) ? (
                  <BookmarkCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <Bookmark className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="flex-1">{q.question_text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CORMappingPanel;
