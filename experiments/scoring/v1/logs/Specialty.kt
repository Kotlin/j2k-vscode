<think>
We are translating an empty Java class to Kotlin.
 The class is named `Specialty` and extends `NamedEntity`.
 We note that the package declaration, imports, annotations (like @Entity and @Table), and class definition should be mirrored in Kotlin.

 Steps:
 1. Keep the same package structure: `package org.springframework.samples.petclinic.vet;`
    In Kotlin, we don't need to change the package unless there are specific differences.

 2. The import statements remain mostly the same, but note that in Kotlin we can use shorter names for some standard classes.
    However, since this is a simple class and `NamedEntity` might be part of the project, we keep it as is.
    Also, note that `jakarta.persistence.Entity` and `jakarta.persistence.Table` are annotations from Jakarta EE (formerly Java EE).
    In Kotlin, these annotations can be kept because they are not specific to the language.

 3. The class annotation: 
        @Entity
        @Table(name = "specialties")
    We keep them as is in Kotlin.

 4. The class definition:
        public class Specialty extends NamedEntity

    In Kotlin, we use `open` if we want it to be extended (since by default top-level classes are final). But note that the original code does not specify any methods or constructors.
    Since this is a simple entity and in Kotlin we don't have an explicit constructor unless defined, we can just make it open.

 5. We also need to consider if there's any data class features? The Java class doesn't have any properties declared so we cannot assume it's a data class.

 However, note that the original class is extending `NamedEntity` and has no fields or methods. In Kotlin, when translating an empty class with only annotations, we can do:

    open class Specialty : NamedEntity()

 But wait: in Java, if you extend a class without any constructor arguments, it's okay because the super class (if it has a default/no-arg constructor) is called.

 Let's check `NamedEntity` from the import. Since we don't have its code, but typically such entities might be abstract and provide constructors? However, in Kotlin if we extend an open class that doesn't define any primary constructor parameters, then we can just use:

    open class Specialty : NamedEntity()

 But note: the original Java class does not call super(). So it must rely on a no-arg constructor. In Kotlin, by default, every class has a synthetic no-arg constructor if there are no other constructors and at least one primary constructor.

 However, since `NamedEntity` is being extended and we don't know its structure, but the Java code doesn't require any initialization from the subclass, it's safe to assume that having an empty body with just the annotation of extending is acceptable.

 But note: in Kotlin, if you extend a class without parameters, you can do so. However, let me clarify:

    In Java:
        public class Specialty extends NamedEntity { ... }

    This means that `Specialty` has no explicit constructor and uses the default one (which calls super() with no arguments). So for Kotlin to be equivalent, we need a primary constructor without parameters? Actually, in Kotlin if you don't define any constructors, it provides a no-arg constructor. But since we are extending `NamedEntity`, which might have its own no-arg constructor or require one, the empty class in Kotlin is fine.

 However, let's look at the import: `import org.springframework.samples.petclinic.model.NamedEntity;`

 We don't know if `NamedEntity` has a parameterized constructor. But without more context, we can only translate what we see.

 Since the Java code does not have any constructors or fields, and it extends `NamedEntity`, in Kotlin we can simply write:

    open class Specialty : NamedEntity()

 But wait: is there an empty primary constructor? In Kotlin, if you don't define a constructor, then by default the class has a constructor with no parameters (if all superclasses have such constructors). However, note that `NamedEntity` might be defined in another language or have different structure.

 Alternatively, we can write:

    open class Specialty : NamedEntity()

 This is equivalent to having an empty body and relying on the synthetic no-arg constructor. But if `NamedEntity` requires a parameterized constructor, then this would break.

 However, without knowing the details of `NamedEntity`, we must stick to what's given. The Java code does not show any constructors in `Specialty`. So let's assume that `NamedEntity` has a no-arg constructor and proceed.

 But note: sometimes extending an entity might require passing parameters. Since we don't have information, we cannot change the signature arbitrarily.

 Let me reexamine: In the absence of any explicit constructor in Java for `Specialty`, it uses the default one (no arguments). Therefore, if `NamedEntity` has a no-arg constructor, then this is fine. If not, then we would need to define a constructor with parameters and call super appropriately.

 However, without knowing `NamedEntity`, we cannot do that. So in Kotlin, we can either:

    - Define an empty primary constructor (which by default calls the superclass no-arg constructor) if it exists.
    - Or, if `NamedEntity` has a parameterized constructor, then we must define one.

 But again, without knowing `NamedEntity`, we cannot be sure. However, note that in Java, extending a class with parameters would require calling super with those parameters. Since the original code does not have any constructors defined and no call to super (so it uses the default), we can assume that `NamedEntity` has a no-arg constructor.

 Alternatively, if we are concerned about compatibility, we might write:

    open class Specialty : NamedEntity()

 This is safe because in Java, without an explicit constructor, the compiler provides a public no-arg constructor. So Kotlin will call it and then the superclass's no-arg constructor must exist or be accessible.

 Since the problem does not specify any parameters for `NamedEntity`, we can proceed with this.

 However, note that the original class is empty (no fields, no methods). In Kotlin, if you don't need to change anything, just translating the annotations and package might be enough. But let's write it as an open class extending NamedEntity without a constructor body because in Java there was none.

 Let me check: The Java code has `public class Specialty extends NamedEntity { }` so no constructors are defined. In Kotlin, we can do:

    open class Specialty : NamedEntity()

 This is the direct translation and should work if `NamedEntity` has a no-arg constructor.

 But wait: what about the annotations? We keep them as they are because they are not language-specific (they are JPA annotations).

 Also note: The original code uses `@Entity` and `@Table`. These are retained in Kotlin.

 Let's write the Kotlin code accordingly.
</think>
open class Specialty : NamedEntity()