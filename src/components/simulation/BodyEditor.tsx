import React, { useState, useEffect } from "react";

interface Body {
    id: number;
    position: {
        x: number;
        y: number;
    };
    velocity: {
        x: number;
        y: number;
    };
    mass: number;
    radius: number;
    color: string;
}

interface BodyUpdateParams {
    mass: number;
    radius: number;
    position_x: number;
    position_y: number;
    velocity_x: number;
    velocity_y: number;
    color: string;
}

interface BodyEditorProps {
    body: Body | undefined;
    onUpdate: (updates: BodyUpdateParams) => void;
}

interface FormState {
    mass: number;
    radius: number;
    position_x: number;
    position_y: number;
    velocity_x: number;
    velocity_y: number;
    color: string;
}

const BodyEditor: React.FC<BodyEditorProps> = ({ body, onUpdate }) => {
    const [formState, setFormState] = useState<FormState>({
        mass: 0,
        radius: 0,
        position_x: 0,
        position_y: 0,
        velocity_x: 0,
        velocity_y: 0,
        color: "#ffffff",
    });

    // Update form when selected body changes
    useEffect(() => {
        if (body) {
            setFormState({
                mass: body.mass,
                radius: body.radius,
                position_x: body.position.x,
                position_y: body.position.y,
                velocity_x: body.velocity.x,
                velocity_y: body.velocity.y,
                color: body.color,
            });
        }
    }, [body]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setFormState((prev) => ({
            ...prev,
            [name]: name === "color" ? value : parseFloat(value),
        }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        onUpdate({
            mass: formState.mass,
            radius: formState.radius,
            position_x: formState.position_x,
            position_y: formState.position_y,
            velocity_x: formState.velocity_x,
            velocity_y: formState.velocity_y,
            color: formState.color,
        });
    };

    if (!body) return null;

    return (
        <div className="body-editor">
            <h3>Edit Body {body.id}</h3>

            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <label>
                        Mass:
                        <input
                            type="number"
                            name="mass"
                            value={formState.mass}
                            onChange={handleChange}
                            step="1000"
                        />
                    </label>
                </div>

                <div className="form-row">
                    <label>
                        Radius:
                        <input
                            type="number"
                            name="radius"
                            value={formState.radius}
                            onChange={handleChange}
                            step="1"
                            min="1"
                        />
                    </label>
                </div>

                <div className="form-row">
                    <label>
                        Position X:
                        <input
                            type="number"
                            name="position_x"
                            value={formState.position_x}
                            onChange={handleChange}
                            step="10"
                        />
                    </label>
                </div>

                <div className="form-row">
                    <label>
                        Position Y:
                        <input
                            type="number"
                            name="position_y"
                            value={formState.position_y}
                            onChange={handleChange}
                            step="10"
                        />
                    </label>
                </div>

                <div className="form-row">
                    <label>
                        Velocity X:
                        <input
                            type="number"
                            name="velocity_x"
                            value={formState.velocity_x}
                            onChange={handleChange}
                            step="5"
                        />
                    </label>
                </div>

                <div className="form-row">
                    <label>
                        Velocity Y:
                        <input
                            type="number"
                            name="velocity_y"
                            value={formState.velocity_y}
                            onChange={handleChange}
                            step="5"
                        />
                    </label>
                </div>

                <div className="form-row">
                    <label>
                        Color:
                        <input
                            type="color"
                            name="color"
                            value={formState.color}
                            onChange={handleChange}
                        />
                    </label>
                </div>

                <button type="submit" className="update-button">
                    Update Body
                </button>
            </form>
        </div>
    );
};

export default BodyEditor;
