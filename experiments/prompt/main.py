CODE = """// 2025-07-23T08:55:18.029Z (logged at)

/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.owner;

import java.util.ArrayList;
import java.util.List;

import org.springframework.core.style.ToStringCreator;
import org.springframework.samples.petclinic.model.Person;
import org.springframework.util.Assert;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;

/**
 * Simple JavaBean domain object representing an owner.
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Michael Isvy
 * @author Oliver Drotbohm
 * @author Wick Dynex
 */
@Entity
@Table(name = "owners")
public class Owner extends Person {

	@Column(name = "address")
	@NotBlank
	private String address;

	@Column(name = "city")
	@NotBlank
	private String city;

	@Column(name = "telephone")
	@NotBlank
	@Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
	private String telephone;

	@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
	@JoinColumn(name = "owner_id")
	@OrderBy("name")
	private final List<Pet> pets = new ArrayList<>();

	public String getAddress() {
		return this.address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public String getCity() {
		return this.city;
	}

	public void setCity(String city) {
		this.city = city;
	}

	public String getTelephone() {
		return this.telephone;
	}

	public void setTelephone(String telephone) {
		this.telephone = telephone;
	}

	public List<Pet> getPets() {
		return this.pets;
	}

	public void addPet(Pet pet) {
		if (pet.isNew()) {
			getPets().add(pet);
		}
	}

	/**
	 * Return the Pet with the given name, or null if none found for this Owner.
	 * @param name to test
	 * @return the Pet with the given name, or null if no such Pet exists for this Owner
	 */
	public Pet getPet(String name) {
		return getPet(name, false);
	}

	/**
	 * Return the Pet with the given id, or null if none found for this Owner.
	 * @param id to test
	 * @return the Pet with the given id, or null if no such Pet exists for this Owner
	 */
	public Pet getPet(Integer id) {
		for (Pet pet : getPets()) {
			if (!pet.isNew()) {
				Integer compId = pet.getId();
				if (compId.equals(id)) {
					return pet;
				}
			}
		}
		return null;
	}

	/**
	 * Return the Pet with the given name, or null if none found for this Owner.
	 * @param name to test
	 * @param ignoreNew whether to ignore new pets (pets that are not saved yet)
	 * @return the Pet with the given name, or null if no such Pet exists for this Owner
	 */
	public Pet getPet(String name, boolean ignoreNew) {
		for (Pet pet : getPets()) {
			String compName = pet.getName();
			if (compName != null && compName.equalsIgnoreCase(name)) {
				if (!ignoreNew || !pet.isNew()) {
					return pet;
				}
			}
		}
		return null;
	}

	@Override
	public String toString() {
		return new ToStringCreator(this).append("id", this.getId())
			.append("new", this.isNew())
			.append("lastName", this.getLastName())
			.append("firstName", this.getFirstName())
			.append("address", this.address)
			.append("city", this.city)
			.append("telephone", this.telephone)
			.toString();
	}

	/**
	 * Adds the given {@link Visit} to the {@link Pet} with the given identifier.
	 * @param petId the identifier of the {@link Pet}, must not be {@literal null}.
	 * @param visit the visit to add, must not be {@literal null}.
	 */
	public void addVisit(Integer petId, Visit visit) {

		Assert.notNull(petId, "Pet identifier must not be null!");
		Assert.notNull(visit, "Visit must not be null!");

		Pet pet = getPet(petId);

		Assert.notNull(pet, "Invalid Pet identifier!");

		pet.addVisit(visit);
	}

}
"""

TASK_CONTEXT = """You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist."""

TASK_DESCRIPTION = """Your task is to convert provided Java code into **idiomatic Kotlin**, preserving behaviour while improving readability, safety and maintainability."""

# few-shot prompting examples might help
EXAMPLES = """Some examples are given for you below.

<example>
<java>
public class Greeter {
    public static void greet(String name) {
        if (name != null) {
            System.out.println("Hello, " + name);
        } else {
            System.out.println("Hello, Guest");
        }
    }
}
</java>

<convert_think>
1: I'm looking at the Java and noticing a lot, like how the Greeter class is implicitly open and how the greet method is static. These would map to the open keyword and companion objects respectively in Kotlin.

<kotlin>
open class Greeter {
    companion object {
        fun greet(name: String?) {
            if (name != null) {
                println("Hello, " + name)
            } else {
                println("Hello, Guest")
            }
        }
    }
}
</kotlin>

2: In my previous conversion, I converted the Java `String` to the Kotlin `String?`, which handles the only instance of nullability in the code. I can tell this is necessary, as within the code the author has explicitly checked for nullability, so clearly the parameter may possibly be null. Additionally, I don't notice any cases where I might need to convert `var` to `val`, so I won't apply any transformations on this front.

<kotlin>
open class Greeter {
    companion object {
        fun greet(name: String?) {
            if (name != null) {
                println("Hello, " + name)
            } else {
                println("Hello, Guest")
            }
        }
    }
}
</kotlin>

3: I don't notice any collections within this code, so I won't apply any transformations here. The code is the same as from the step before.

<kotlin>
open class Greeter {
    companion object {
        fun greet(name: String?) {
            if (name != null) {
                println("Hello, " + name)
            } else {
                println("Hello, Guest")
            }
        }
    }
}
</kotlin>

Step 4: I see that the greet function is not tightly coupled with any other aspects of the Greeter class. Therefore, I will move this to be a top level function. Additionally, I notice that we are formatting the string conditionally based on nullability, so Kotlin's template literals would provide an idiomatic translation here, as well as the Elvis operator. I don't see anywhere else to apply other transformations, so I will stop here.

<kotlin>
fun greet(name: String?) {
    println("Hello, ${name ?: "Guest"}")
}
</kotlin>
</convert_think>

<kotlin>
fun greet(name: String?) {
    println("Hello, ${name ?: "Guest"}")
}
</kotlin>
</example>

<example>
<java>
import java.util.ArrayList;
import java.util.List;

public class Counter {
    public static void count(List<String> items) {
        for (int i = 0; i < items.size(); i++) {
            System.out.println("Item " + i + ": " + items.get(i));
        }
    }

    public static List<String> getNames() {
        List<String> names = new ArrayList<>();
        names.add("Alice");
        names.add("Bob");
        return names;
    }
}
</java>

<convert_think>
1: I notice that the Java has a public (implicitly open) class `Counter`, with static methods like `count` and `getNames`. These map to an open class and a companion object in Kotlin, so I'll apply these transformations as part of this step. Additionally, we are concatenating strings to form an output - Kotlin's template literals should help us with this.

<kotlin>
open class Counter {
    companion object {
        fun count(items: List<String>) {
            for (i in 0 until items.size) {
                println("Item $i: ${items[i]}")
            }
        }

        fun getNames(): List<String> {
            val names = ArrayList<String>()
            names.add("Alice")
            names.add("Bob")
            return names
        }
    }
}
</kotlin>

Step 2: Since the original author of the Java didn't check for nullability in the code, I'm going to assume that the author considered that the parameters to each of these functions wouldn't be null. This approach won't introduce any bugs into the code that weren't previously there.

<kotlin>
class Counter {
    companion object {
        fun count(items: List<String>) {
            for (i in 0 until items.size) {
                println("Item $i: ${items[i]}")
            }
        }

        fun getNames(): List<String> {
            val names = mutableListOf("Alice", "Bob")
            return names
        }
    }
}
</kotlin>

3: For `getNames()`, since it returns the list it creates, we don't have any guarantee that it will be used immutably. I'm therefore going to use a `MutableList` instead, with the `mutableListOf` constructor. Additionally, the `List` type from Java maps to the `MutableList` type from Kotlin, so let's update the apparent return value of `getNames()`. However, since count only requires read access to `items`, we can provide `items` with the more general apparent Kotlin type of `List`.

<kotlin>
class Counter {
    companion object {
        fun count(items: List<String>) {
            for (i in 0 until items.size) {
                println("Item $i: ${items[i]}")
            }
        }

        fun getNames(): MutableList<String> {
            val names = mutableListOf("Alice", "Bob")
            return names
        }
    }
}
</kotlin>

4: I see that the functions aren't tightly coupled with any elements of the `Counter` class, so they would be better as top-level functions. Additionally, since we require the index when iterating through `items`, we can use the more idiomatic .forEachIndexed to iterate through. Finally, getNames() can be written as an expression to improve Kotlin idiomaticness and readability.

<kotlin>
fun count(items: List<String>) {
    items.forEachIndexed { i, item ->
        println("Item $i: $item")
    }
}

fun getNames(): MutableList<String> = mutableListOf("Alice", "Bob")
</kotlin>
</convert_think>

<kotlin>
fun count(items: List<String>) {
    items.forEachIndexed { i, item ->
        println("Item $i: $item")
    }
}

fun getNames(): MutableList<String> = mutableListOf("Alice", "Bob")
</kotlin>
</example>
"""

INPUT_DATA = f"""The Java code to convert is:
<java>
{CODE}
</java>"""

PRECOGNITION = """Before emitting any code, run through the provided Java input and perform these 4 steps of thinking, wrapped in <convert_think> tags.
After each step of thinking, output the code as you have it after the step's transformation has been applied.

1: Convert the Java code 1 to 1 to Kotlin, prioritising exact replication of the Java code's functionality and logic.
    - Tips: Java classes are implicitly open, Kotlin classes are implicitly final.
2: Ensure mutability and nullability are correctly expressed in your Kotlin conversion. Add `?` to types that can be null, and use Kotlin's type inference where applicable. Use val instead of var where only read access is necessary.
3: Convert datatypes like collections from their Java variants to the Kotlin builtins. Make sure to keep mutability of the collection in mind, to ensure that the final Kotlin collection is mutable if required, otherwise keep the output immutable.
4: Introduce syntactic transformations to make the output truly idiomatic. - Tips: Getters and setters can be implemented easily in Kotlin's syntax, so use these, making sure to remove the associated Java getter/setter method artifacts. Functions that make sense to exist at the top level (e.g. an isolated main() function, helper functions not attached to a class) should be moved to the top level.
            Lambdas should be used where they make sense in combination with functional syntax.
            There are many different ways to implement loops in Kotlin - for, .forEach, .forEachIndexed. Use the idiomatic choice, making sure to reason why it is the correct choice.
"""

OUTPUT_FORMATTING = """Wrap your conversion result in <kotlin> tags."""

REMARKS = """Ensure the final Kotlin output would compile and run identically to the Java input."""

PREFILL = """<convert_think>\n"""

PROMPT = ""

if TASK_CONTEXT:
  PROMPT += f"""{TASK_CONTEXT}"""

if EXAMPLES:
  PROMPT += f"""\n\n{EXAMPLES}"""

if INPUT_DATA:
  PROMPT += f"""\n\n{INPUT_DATA}"""

if PRECOGNITION:
  PROMPT += f"""\n\n{PRECOGNITION}"""

if OUTPUT_FORMATTING:
  PROMPT += f"""\n\n{OUTPUT_FORMATTING}"""

if REMARKS:
  PROMPT += f"""\n\n{REMARKS}"""

import requests
import json

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "deepseek-r1:8b"

messages = [
    {
        "role": "system",
        "content": (
            "You are a senior Kotlin engineer and Java-Kotlin JVM interop specialist. "
            "Follow the four-step conversion (<convert_think>) and output final code in <kotlin> tags. "
            "Preserve behavior and API, prefer idiomatic Kotlin when safe."
        )
    },
    { "role": "user", "content": PROMPT },
    { "role": "assistant", "content": PREFILL }
]

payload = {
    "model": MODEL,
    "messages": messages,
    "options": {
        "temperature": 0,
        "num_ctx": 8192 * 2,  # increase if your examples are long
    },
    "stream": False  # set True to stream tokens
}

resp = requests.post(OLLAMA_URL, json=payload, timeout=600)
resp.raise_for_status()
data = resp.json()

text = data["message"]["content"]
print(text)
