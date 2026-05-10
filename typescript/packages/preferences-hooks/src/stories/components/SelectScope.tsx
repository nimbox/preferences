export interface SelectScopeProps {

    value: string;
    scopes: string[];
    onChange: (value: string) => void;

}

export function SelectScope(props: SelectScopeProps) {

    const { value, scopes, onChange } = props;

    return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {scopes.map((scope) => (
                <button
                    key={scope}
                    type="button"
                    disabled={scope === value}
                    onClick={() => onChange(scope)}
                >
                    {scope}
                </button>
            ))}
        </div>
    );

}
