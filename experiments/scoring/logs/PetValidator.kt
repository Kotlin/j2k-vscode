package org.springframework.samples.petclinic.owner

import org.springframework.util.StringUtils
import org.springframework.validation.Errors
import org.springframework.validation.Validator

open class PetValidator {
    // Fields from Java: none declared, but we are using getters to access them.
    // We'll keep the same structure for now.

    override fun validate(obj: Any?, errors: Errors) {
        val pet = obj as? Pet ?: return
        val name = pet.name
        if (!StringUtils.hasText(name)) {
            errors.rejectValue("name", REQUIRED, REQUIRED)
        }

        // type validation
        if (pet.isNew && pet.type == null) {
            errors.rejectValue("type", REQUIRED, REQUIRED)
        }

        // birth date validation
        if (pet.birthDate == null) {
            errors.rejectValue("birthDate", REQUIRED, REQUIRED)
        }
    }

    override fun supports(clazz: Class<*>): Boolean {
        return Pet::class.java.isAssignableFrom(clazz)
    }
}