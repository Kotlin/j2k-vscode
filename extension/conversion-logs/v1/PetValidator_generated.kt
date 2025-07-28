// 2025-07-22T09:11:11.811Z (logged at)

package org.springframework.samples.petclinic.owner;

import org.springframework.util.StringUtils;
import org.springframework.validation.Errors;
import org.springframework.validation.Validator;

/**
 * Validator for [Pet] forms.
 */
class PetValidator : Validator {

    /**
     * The name of the required error message.
     */
    private val REQUIRED = "required"

    /**
     * Validates a [Pet] instance.
     */
    override fun validate(obj: Any, errors: Errors) {
        val pet = obj as Pet
        val name = pet.name
        // name validation
        if (!StringUtils.hasText(name)) {
            errors.rejectValue("name", REQUIRED, REQUIRED)
        }

        // type validation
        if (pet.isNew() && pet.type == null) {
            errors.rejectValue("type", REQUIRED, REQUIRED)
        }

        // birth date validation
        if (pet.birthDate == null) {
            errors.rejectValue("birthDate", REQUIRED, REQUIRED)
        }
    }

    /**
     * Returns true if this Validator supports the given class.
     */
    override fun supports(clazz: Class<*>): Boolean {
        return Pet::class.java.isAssignableFrom(clazz)
    }
}
  </START_J2K>>