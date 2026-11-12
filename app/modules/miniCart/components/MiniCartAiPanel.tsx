type MiniCartAiPanelProps = {
  input: string;
  onInputChange: (value: string) => void;
};

const QUICK_CHIPS = [
  "Схема эрадикации H. pylori",
  "Длительность ИПН",
  "Контроль заживления",
];

/**
 * Визуальный перенос вкладки EasyMed AI.
 * Демо-ответы сервера не подключены — только каркас интерфейса.
 */
export default function MiniCartAiPanel({
  input,
  onInputChange,
}: MiniCartAiPanelProps) {
  return (
    <div className="preparaty__ai-chat">
      <div className="preparaty__ai-thread" aria-live="polite">
        <div className="preparaty__ai-msg preparaty__ai-msg--ai">
          <div className="preparaty__ai-msg-meta">
            <span className="preparaty__ai-msg-author">EasyMed AI</span>
          </div>
          <div className="preparaty__ai-bubble">
            <p>
              Здравствуйте. Я помогу сориентироваться по клиническим рекомендациям
              и подсказать возможные исследования. Это визуальный прототип — ответы
              сервера будут подключены позже.
            </p>
            <div className="preparaty__ai-chips">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="preparaty__ai-chip"
                  onClick={() => onInputChange(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <form
        className="preparaty__ai-compose"
        action="#"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <textarea
          className="preparaty__ai-input"
          rows={1}
          maxLength={1000}
          placeholder="Задайте вопрос по клиническим рекомендациям…"
          aria-label="Сообщение для EasyMed AI"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <button
          type="submit"
          className="preparaty__ai-send"
          title="Отправить"
          aria-label="Отправить"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M2.2 8.1 L13.4 2.6c.5-.25.95.2.7.7L8.6 13.7c-.25.5-.9.4-1-.15L6.4 9.1 2.35 7.9c-.55-.2-.45-.85-.15-.8z"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
